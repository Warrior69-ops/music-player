import { useState, useEffect, useRef, useCallback } from 'react';
import { usePlayerStore, Track, getTrackId } from '@/store/usePlayerStore';
import api from '@/lib/api';
import { create } from 'zustand';

// ── Persistent Dual-Audio Nodes & Web Audio Engine ────────────────────────
let audioA: HTMLAudioElement | null = null;
let audioB: HTMLAudioElement | null = null;
let currentActive: 'A' | 'B' = 'A';

let audioCtx: AudioContext | null = null;
let gainA: GainNode | null = null;
let gainB: GainNode | null = null;
let sourceA: MediaElementAudioSourceNode | null = null;
let sourceB: MediaElementAudioSourceNode | null = null;

let currentLoadedTrackId: string | null = null;
let warmedUpTrackId: string | null = null;
let isCrossfading = false;
let crossfadeTimeout: NodeJS.Timeout | null = null;
let lastTransitionTimestamp = 0;
let isFetchingStream = false;
let listenersAttached = false;

// ── Shared Audio Progress Store (Singleton across all hook consumers) ─────
interface AudioState {
  currentTime: number;
  duration: number;
  isLoading: boolean;
  setAudioState: (partial: Partial<{ currentTime: number; duration: number; isLoading: boolean }>) => void;
}

export const useAudioStateStore = create<AudioState>((set) => ({
  currentTime: 0,
  duration: 0,
  isLoading: false,
  setAudioState: (partial) => set((state) => ({ ...state, ...partial })),
}));

function getActiveAudio() {
  return currentActive === 'A' ? audioA : audioB;
}

function getStandbyAudio() {
  return currentActive === 'A' ? audioB : audioA;
}

function getTrackStreamUrl(track: Track): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const id = getTrackId(track);
  if (track.provider === 'youtube' || !track.provider) {
    return `${apiUrl}/music/proxy/youtube/${id}`;
  }
  return track.audioUrl || '';
}

function initAudioContext() {
  if (typeof window === 'undefined' || audioCtx) return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    audioCtx = new AudioContextClass();

    if (audioA && !sourceA) {
      sourceA = audioCtx.createMediaElementSource(audioA);
      gainA = audioCtx.createGain();
      sourceA.connect(gainA);
      gainA.connect(audioCtx.destination);
    }

    if (audioB && !sourceB) {
      sourceB = audioCtx.createMediaElementSource(audioB);
      gainB = audioCtx.createGain();
      sourceB.connect(gainB);
      gainB.connect(audioCtx.destination);
    }
  } catch (e: any) {
    console.debug('Web Audio API init fallback:', e.message);
  }
}

function ensureAudioNodes() {
  if (typeof window === 'undefined') return;
  if (!audioA) {
    audioA = new Audio();
    audioA.crossOrigin = 'anonymous';
  }
  if (!audioB) {
    audioB = new Audio();
    audioB.crossOrigin = 'anonymous';
  }
}

/** Preloads backend first-chunk buffer and browser standby HTML5 Audio node on hover or next-in-queue */
export function warmupStandbyTrack(track: Track) {
  if (typeof window === 'undefined' || !track) return;
  const id = getTrackId(track);
  if (!id) return;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // 1. Silent backend prefetch (warms yt-dlp + first-chunk RAM buffer)
  if (track.provider === 'youtube' || !track.provider) {
    api.get(`/music/proxy/youtube/${id}/prefetch`)
      .then(() => {
        usePlayerStore.getState().addWarmedTrackId(id);
      })
      .catch(() => {});
  }

  // 2. Pre-assign to standby HTML5 Audio node if available (do not touch if crossfading!)
  if (isCrossfading) return;
  ensureAudioNodes();
  const standby = getStandbyAudio();
  if (standby) {
    const targetUrl = getTrackStreamUrl(track);
    if (targetUrl && standby.src !== targetUrl) {
      standby.src = targetUrl;
      standby.preload = 'auto';
      standby.load();
    }
  }
}

/** Attach listeners ONCE globally to persistent audio nodes */
function ensureGlobalListeners() {
  if (typeof window === 'undefined' || listenersAttached) return;
  ensureAudioNodes();
  if (!audioA || !audioB) return;
  listenersAttached = true;

  const setupNodeListeners = (el: HTMLAudioElement, tag: 'A' | 'B') => {
    const isThisActive = () => currentActive === tag;

    const updateDurationIfValid = (targetDuration?: number) => {
      const val = targetDuration !== undefined ? targetDuration : el.duration;
      if (val && !isNaN(val) && isFinite(val) && val > 0) {
        useAudioStateStore.setState((prev) => (Math.abs(prev.duration - val) > 0.5 ? { duration: val } : {}));
      }
    };

    const onLoadedMetadata = () => {
      if (isThisActive()) updateDurationIfValid();
    };

    const onDurationChange = () => {
      if (isThisActive()) updateDurationIfValid();
    };

    const onLoadedData = () => {
      if (isThisActive()) {
        updateDurationIfValid();
        useAudioStateStore.setState({ currentTime: el.currentTime || 0 });
      }
    };

    const onTimeUpdate = () => {
      if (!isThisActive()) return;

      const cur = el.currentTime || 0;
      const elDur = (el.duration && !isNaN(el.duration) && isFinite(el.duration) && el.duration > 0)
        ? el.duration
        : (usePlayerStore.getState().currentTrack?.duration || 0);

      useAudioStateStore.setState({
        currentTime: cur,
        duration: elDur > 0 ? elDur : 0,
      });

      const now = Date.now();
      // Guard: strictly ignore crossfade triggers during post-transition cooldown or early playback
      if (now - lastTransitionTimestamp < 10000 || cur < 15) {
        return;
      }

      const { queue, currentIndex, crossfadeDuration, volume } = usePlayerStore.getState();

      // ── 1. Speculative Next-Track Warmup (at d - 15s) ──
      if (elDur > 25 && cur >= elDur - 15) {
        const nextTrack = queue[currentIndex + 1];
        const nextId = getTrackId(nextTrack);
        if (nextTrack && nextId && nextId !== warmedUpTrackId) {
          warmedUpTrackId = nextId;
          warmupStandbyTrack(nextTrack);
        }
      }

      // ── 2. Apple Music Seamless Overlapping Crossfade (at duration - crossfadeDuration) ──
      const xfadeSec = Math.max(0, crossfadeDuration || 0);
      if (
        xfadeSec > 0 &&
        elDur >= 30 &&
        elDur > xfadeSec * 2 &&
        cur >= elDur - xfadeSec &&
        !isCrossfading
      ) {
        const nextTrack = queue[currentIndex + 1];
        if (nextTrack) {
          isCrossfading = true;
          lastTransitionTimestamp = Date.now();

          const prevActive = el;
          const standby = tag === 'A' ? audioB : audioA;
          const nextUrl = getTrackStreamUrl(nextTrack);

          if (standby && nextUrl) {
            if (standby.src !== nextUrl) {
              standby.src = nextUrl;
              standby.preload = 'auto';
              standby.load();
            }

            initAudioContext();
            if (audioCtx && audioCtx.state === 'suspended') {
              audioCtx.resume().catch(() => {});
            }

            const outgoingGain = tag === 'A' ? gainA : gainB;
            const incomingGain = tag === 'A' ? gainB : gainA;

            // Overlap audio playback: standby plays immediately while current continues
            standby.play().catch((e) => {
              console.warn('Crossfade standby play blocked:', e);
              isCrossfading = false;
            });

            if (audioCtx && outgoingGain && incomingGain) {
              const audioNow = audioCtx.currentTime;
              outgoingGain.gain.setValueAtTime(outgoingGain.gain.value || volume, audioNow);
              outgoingGain.gain.linearRampToValueAtTime(0.001, audioNow + xfadeSec);

              incomingGain.gain.setValueAtTime(0.001, audioNow);
              incomingGain.gain.linearRampToValueAtTime(volume, audioNow + xfadeSec);
            }

            // Pre-register track ID to prevent double load on store update
            currentLoadedTrackId = getTrackId(nextTrack);

            if (crossfadeTimeout) clearTimeout(crossfadeTimeout);
            crossfadeTimeout = setTimeout(() => {
              // Completely neutralize outgoing audio element
              try {
                prevActive.pause();
                prevActive.removeAttribute('src');
                prevActive.load();
              } catch {}

              // Swap active pointer
              currentActive = currentActive === 'A' ? 'B' : 'A';
              const nextActive = currentActive === 'A' ? audioA : audioB;

              // Advance track in store
              lastTransitionTimestamp = Date.now();
              usePlayerStore.getState().nextTrack();
              const newTrack = usePlayerStore.getState().currentTrack;

              const newDur = (nextActive && !isNaN(nextActive.duration) && isFinite(nextActive.duration) && nextActive.duration > 0)
                ? nextActive.duration
                : (newTrack?.duration || 0);

              useAudioStateStore.setState({
                duration: newDur,
                currentTime: nextActive ? nextActive.currentTime : 0,
                isLoading: false,
              });

              isCrossfading = false;
              crossfadeTimeout = null;
            }, xfadeSec * 1000);
          }
        }
      }
    };

    const onEnded = () => {
      if (!isThisActive() || isCrossfading) return;
      const now = Date.now();
      // Guard: strictly ignore ended event if transition occurred within 5 seconds
      if (now - lastTransitionTimestamp < 5000) return;

      const elDur = (el.duration && !isNaN(el.duration) && isFinite(el.duration) && el.duration > 0)
        ? el.duration
        : (usePlayerStore.getState().currentTrack?.duration || 0);

      // Guard: ignore premature ended events if currentTime has not reached near end of song
      if (el.currentTime < Math.max(10, elDur - 5)) {
        console.warn('Ignoring premature ended event:', el.currentTime, elDur);
        return;
      }

      lastTransitionTimestamp = Date.now();
      usePlayerStore.getState().nextTrack();
    };

    const onWaiting = () => {
      if (isThisActive()) useAudioStateStore.setState({ isLoading: true });
    };

    const onCanPlay = () => {
      if (isThisActive()) {
        useAudioStateStore.setState({ isLoading: false });
        updateDurationIfValid();
      }
    };

    const onPlaying = () => {
      if (isThisActive()) {
        useAudioStateStore.setState({ isLoading: false });
        updateDurationIfValid();
      }
    };

    const onError = () => {
      if (isThisActive()) {
        const err = el.error;
        if (err) console.error(`HTML5 Audio error on ${tag}:`, { code: err.code, message: err.message });
        useAudioStateStore.setState({ isLoading: false });
        usePlayerStore.getState().setIsPlaying(false);
      }
    };

    el.addEventListener('loadedmetadata', onLoadedMetadata);
    el.addEventListener('durationchange', onDurationChange);
    el.addEventListener('loadeddata', onLoadedData);
    el.addEventListener('timeupdate', onTimeUpdate);
    el.addEventListener('ended', onEnded);
    el.addEventListener('waiting', onWaiting);
    el.addEventListener('canplay', onCanPlay);
    el.addEventListener('playing', onPlaying);
    el.addEventListener('error', onError);
  };

  setupNodeListeners(audioA, 'A');
  setupNodeListeners(audioB, 'B');
}

export function useAudioPlayer() {
  const { currentTrack, isPlaying, setIsPlaying, volume, playNext, queue, currentIndex } = usePlayerStore();
  const { currentTime, duration, isLoading } = useAudioStateStore();

  const playNextRef = useRef(playNext);
  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  // Ensure singleton audio nodes & listeners are initialized
  useEffect(() => {
    ensureGlobalListeners();
  }, []);

  // Update volume on singleton nodes & gains
  useEffect(() => {
    if (audioA) audioA.volume = volume;
    if (audioB) audioB.volume = volume;

    if (audioCtx && gainA && gainB) {
      const activeGain = currentActive === 'A' ? gainA : gainB;
      activeGain.gain.setValueAtTime(volume, audioCtx.currentTime);
    }
  }, [volume]);

  // ── Speculative Queue Pipeline (2 Tracks Ahead) ─────────────────────────
  useEffect(() => {
    if (currentIndex === -1 || queue.length === 0) return;

    const nextTrack = queue[currentIndex + 1];
    const afterNextTrack = queue[currentIndex + 2];

    if (nextTrack) {
      warmupStandbyTrack(nextTrack);
    }
    if (afterNextTrack) {
      const id = getTrackId(afterNextTrack);
      if (id && (afterNextTrack.provider === 'youtube' || !afterNextTrack.provider)) {
        api.get(`/music/proxy/youtube/${id}/prefetch`).catch(() => {});
      }
    }
  }, [currentIndex, queue]);

  // ── Track Change & Playback Stream Handler ──────────────────────────────
  useEffect(() => {
    const fetchAndPlayStream = async () => {
      if (!currentTrack) return;
      const trackId = getTrackId(currentTrack);
      if (!trackId) return;

      // If track was already transitioned into (e.g. via crossfade), synchronize duration and return
      if (currentLoadedTrackId === trackId) {
        const active = getActiveAudio();
        const activeDur = (active && !isNaN(active.duration) && isFinite(active.duration) && active.duration > 0)
          ? active.duration
          : (currentTrack.duration || 0);

        useAudioStateStore.setState({
          duration: activeDur,
          currentTime: active ? active.currentTime : 0,
          isLoading: false,
        });
        return;
      }

      if (isFetchingStream) return;
      isFetchingStream = true;
      currentLoadedTrackId = trackId;

      // Abort any lingering crossfade timeout on manual song change
      if (crossfadeTimeout) {
        clearTimeout(crossfadeTimeout);
        crossfadeTimeout = null;
        isCrossfading = false;
      }

      useAudioStateStore.setState({
        isLoading: true,
        currentTime: 0,
        duration: currentTrack.duration || 0,
      });

      initAudioContext();
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }

      let targetUrl = getTrackStreamUrl(currentTrack);
      if (!targetUrl) {
        try {
          const response = await api.get(`/music/stream/${currentTrack.provider}/${trackId}`);
          targetUrl = response.data.data;
        } catch (e) {
          console.error('Failed to resolve stream URL:', e);
        }
      }

      const active = getActiveAudio();
      const standby = getStandbyAudio();

      if (!active || !standby || !targetUrl) {
        useAudioStateStore.setState({ isLoading: false });
        isFetchingStream = false;
        return;
      }

      try {
        // Check if Standby Audio was already pre-buffered (Instant 0ms Swap)
        const isStandbyReady = standby.src === targetUrl && standby.readyState >= 1;

        if (isStandbyReady) {
          const prevActive = active;
          const nextActive = standby;

          // Swap active pointer
          currentActive = currentActive === 'A' ? 'B' : 'A';
          lastTransitionTimestamp = Date.now();

          if (audioCtx && gainA && gainB) {
            const now = audioCtx.currentTime;
            const activeGain = currentActive === 'A' ? gainA : gainB;
            const outgoingGain = currentActive === 'A' ? gainB : gainA;

            outgoingGain.gain.setValueAtTime(outgoingGain.gain.value || volume, now);
            outgoingGain.gain.linearRampToValueAtTime(0.001, now + 0.8);
            setTimeout(() => {
              try {
                prevActive.pause();
                prevActive.removeAttribute('src');
                prevActive.load();
              } catch {}
            }, 800);

            activeGain.gain.setValueAtTime(0.001, now);
            activeGain.gain.linearRampToValueAtTime(volume, now + 0.8);
          } else {
            try {
              prevActive.pause();
              prevActive.removeAttribute('src');
              prevActive.load();
            } catch {}
          }

          const nextDur = (nextActive && !isNaN(nextActive.duration) && isFinite(nextActive.duration) && nextActive.duration > 0)
            ? nextActive.duration
            : (currentTrack.duration || 0);

          useAudioStateStore.setState({
            duration: nextDur,
            currentTime: nextActive ? nextActive.currentTime : 0,
            isLoading: false,
          });

          usePlayerStore.getState().setIsInstantLaunch(true);
          setTimeout(() => {
            usePlayerStore.getState().setIsInstantLaunch(false);
          }, 3500);

          if (isPlaying) {
            nextActive.play().catch((err) => {
              console.warn('Playback blocked by autoplay policy:', err.message);
            });
          }

          api.post('/history', currentTrack).catch(console.error);
          isFetchingStream = false;
          return;
        }

        // Standard Load onto Active Node
        lastTransitionTimestamp = Date.now();
        if (active.src !== targetUrl) {
          active.src = targetUrl;
          active.load();
        }

        if (audioCtx && gainA && gainB) {
          const activeGain = currentActive === 'A' ? gainA : gainB;
          activeGain.gain.setValueAtTime(volume, audioCtx.currentTime);
        }

        if (isPlaying) {
          active.play().catch((err) => {
            console.warn('Playback blocked by autoplay policy:', err.message);
          });
        }

        api.post('/history', currentTrack).catch(console.error);
      } catch (error) {
        console.error('Failed to play track:', error);
        setIsPlaying(false);
        useAudioStateStore.setState({ isLoading: false });
        currentLoadedTrackId = null;
      } finally {
        isFetchingStream = false;
      }
    };

    fetchAndPlayStream();
  }, [currentTrack]);

  // Handle Play/Pause
  useEffect(() => {
    const active = getActiveAudio();
    if (!active || !active.src) return;

    if (isPlaying && active.paused) {
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      active.play().catch((err) => {
        console.warn('Playback interrupted:', err.message);
      });
    } else if (!isPlaying && !active.paused) {
      active.pause();
    }
  }, [isPlaying]);

  const togglePlay = useCallback(() => {
    const { currentTrack, isPlaying, setIsPlaying } = usePlayerStore.getState();
    if (!currentTrack) return;
    setIsPlaying(!isPlaying);
  }, []);

  const seek = useCallback((time: number) => {
    const active = getActiveAudio();
    if (active) {
      active.currentTime = time;
      useAudioStateStore.setState({ currentTime: time });
    }
  }, []);

  const active = getActiveAudio();
  const effectiveDuration =
    (duration > 0 ? duration : 0) ||
    (active && !isNaN(active.duration) && isFinite(active.duration) && active.duration > 0 ? active.duration : 0) ||
    (currentTrack?.duration && currentTrack.duration > 0 ? currentTrack.duration : 0);

  return {
    currentTime,
    duration: effectiveDuration,
    isLoading,
    togglePlay,
    seek,
  };
}
