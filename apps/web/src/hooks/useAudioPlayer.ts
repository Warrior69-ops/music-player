import { useState, useEffect, useRef, useCallback } from 'react';
import { usePlayerStore, Track, getTrackId } from '@/store/usePlayerStore';
import { useEqualizerStore, EQ_FREQUENCIES } from '@/store/useEqualizerStore';
import { useSleepTimerStore } from '@/store/useSleepTimerStore';
import { getOfflineAudioBlobUrl } from './useOfflineSync';
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

// ── 10-Band Graphic EQ, Bass Booster, and Analyser Node Architecture ─────
let eqInputGain: GainNode | null = null;
let eqFilters: BiquadFilterNode[] = [];
let bassBoostFilter: BiquadFilterNode | null = null;
let preampGain: GainNode | null = null;
let masterAnalyser: AnalyserNode | null = null;
let masterOutputGain: GainNode | null = null;
let equalizerSubscribed = false;

let currentLoadedTrackId: string | null = null;
let warmedUpTrackId: string | null = null;
let loggedTrackId: string | null = null;
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

async function resolveStreamUrl(track: Track): Promise<string | null> {
  const trackId = getTrackId(track);
  if (!trackId) return null;
  
  // 1. Check Offline Caching (IndexedDB)
  const offlineUrl = await getOfflineAudioBlobUrl(trackId);
  if (offlineUrl) return offlineUrl;

  // 2. Check Automatic LRU Audio Cache (< 1ms instant play!)
  try {
    const { getCachedAudioBlobUrl } = await import('@/lib/audioCache');
    const cachedBlobUrl = await getCachedAudioBlobUrl(trackId);
    if (cachedBlobUrl) return cachedBlobUrl;
  } catch {}

  // 3. Fallback to Network Stream
  let targetUrl = getTrackStreamUrl(track);
  if (!targetUrl) {
    try {
      const { default: api } = await import('@/lib/api');
      const response = await api.get(`/music/stream/${track.provider}/${trackId}`);
      targetUrl = response.data.data;
    } catch (e) {
      console.error('Failed to resolve stream URL:', e);
    }
  }
  return targetUrl || null;
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

    // EQ Input summing bus
    eqInputGain = audioCtx.createGain();

    // 10-Band Graphic Equalizer Filter Chain
    eqFilters = EQ_FREQUENCIES.map((freq, idx) => {
      const filter = audioCtx!.createBiquadFilter();
      if (idx === 0) {
        filter.type = 'lowshelf';
        filter.frequency.value = freq;
      } else if (idx === EQ_FREQUENCIES.length - 1) {
        filter.type = 'highshelf';
        filter.frequency.value = freq;
      } else {
        filter.type = 'peaking';
        filter.frequency.value = freq;
        filter.Q.value = 1.4;
      }
      filter.gain.value = 0;
      return filter;
    });

    // Chain EQ filters in serial
    let lastNode: AudioNode = eqInputGain;
    for (const filter of eqFilters) {
      lastNode.connect(filter);
      lastNode = filter;
    }

    // Punchy Sub-bass Booster (90Hz low-shelf)
    bassBoostFilter = audioCtx.createBiquadFilter();
    bassBoostFilter.type = 'lowshelf';
    bassBoostFilter.frequency.value = 90;
    bassBoostFilter.gain.value = 0;
    lastNode.connect(bassBoostFilter);
    lastNode = bassBoostFilter;

    // Preamp Gain Node
    preampGain = audioCtx.createGain();
    preampGain.gain.value = 1.0;
    lastNode.connect(preampGain);
    lastNode = preampGain;

    // Master 60fps Real-Time Visualizer Analyser Node
    masterAnalyser = audioCtx.createAnalyser();
    masterAnalyser.fftSize = 256;
    masterAnalyser.smoothingTimeConstant = 0.82;
    lastNode.connect(masterAnalyser);
    lastNode = masterAnalyser;

    // Master Output Gain Node
    masterOutputGain = audioCtx.createGain();
    masterOutputGain.gain.value = 1.0;
    lastNode.connect(masterOutputGain);
    masterOutputGain.connect(audioCtx.destination);

    // Connect dual-audio HTML5 sources into the EQ bus
    if (audioA && !sourceA) {
      sourceA = audioCtx.createMediaElementSource(audioA);
      gainA = audioCtx.createGain();
      sourceA.connect(gainA);
      gainA.connect(eqInputGain);
    }

    if (audioB && !sourceB) {
      sourceB = audioCtx.createMediaElementSource(audioB);
      gainB = audioCtx.createGain();
      sourceB.connect(gainB);
      gainB.connect(eqInputGain);
    }

    // Apply stored EQ settings immediately
    syncEqualizerState();

    // Subscribe to EQ store updates
    if (!equalizerSubscribed) {
      equalizerSubscribed = true;
      useEqualizerStore.subscribe(() => {
        syncEqualizerState();
      });
    }
  } catch (e: any) {
    console.debug('Web Audio API init fallback:', e.message);
  }
}

/** Synchronizes Web Audio filter nodes with the Zustand Equalizer Store */
export function syncEqualizerState() {
  if (!audioCtx || !eqFilters.length) return;
  const { isEnabled, bands, bassBoost, preamp } = useEqualizerStore.getState();
  const now = audioCtx.currentTime;

  if (!isEnabled) {
    eqFilters.forEach((f) => f.gain.setValueAtTime(0, now));
    if (bassBoostFilter) bassBoostFilter.gain.setValueAtTime(0, now);
    if (preampGain) preampGain.gain.setValueAtTime(1.0, now);
    return;
  }

  bands.forEach((val, idx) => {
    if (eqFilters[idx]) {
      eqFilters[idx].gain.setValueAtTime(val || 0, now);
    }
  });

  if (bassBoostFilter) {
    const boostDb = (bassBoost / 100) * 10;
    bassBoostFilter.gain.setValueAtTime(boostDb, now);
  }

  if (preampGain) {
    const linear = Math.pow(10, preamp / 20);
    preampGain.gain.setValueAtTime(linear, now);
  }
}

/** Returns the real-time master AnalyserNode for audio visualization */
export function getAudioAnalyser(): AnalyserNode | null {
  if (!audioCtx) {
    initAudioContext();
  }
  return masterAnalyser;
}

/** Resumes suspended AudioContext if needed */
export function resumeAudioContext() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
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
    resolveStreamUrl(track).then((targetUrl) => {
      if (targetUrl && standby.src !== targetUrl) {
        standby.src = targetUrl;
        standby.preload = 'auto';
        standby.load();
      }
    });
  }
}

/** Attach listeners ONCE globally to persistent audio nodes */
function ensureGlobalListeners() {
  if (typeof window === 'undefined' || listenersAttached) return;
  ensureAudioNodes();
  if (!audioA || !audioB) return;
  listenersAttached = true;

  // Global Spacebar Play/Pause shortcut handler
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      const activeEl = document.activeElement;
      const tagName = activeEl?.tagName?.toLowerCase();
      const isEditable =
        tagName === 'input' ||
        tagName === 'textarea' ||
        (activeEl as HTMLElement)?.isContentEditable;

      // Do not intercept if user is typing into an input field or textarea
      if (isEditable) return;

      // Prevent browser page scroll
      e.preventDefault();

      const { currentTrack, isPlaying, setIsPlaying } = usePlayerStore.getState();
      if (currentTrack) {
        setIsPlaying(!isPlaying);
      }
    }
  });

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

      // ── 0. Log Play History (after 30s or 50% of song) ──
      const currentTrack = usePlayerStore.getState().currentTrack;
      const currentTrackId = currentTrack ? getTrackId(currentTrack) : null;
      if (currentTrackId && currentTrackId !== loggedTrackId) {
        if (elDur > 0 && cur >= Math.min(30, elDur * 0.5)) {
          loggedTrackId = currentTrackId;
          api.post('/history', currentTrack).catch(() => {});
        }
      }

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
      // Skip crossfade if sleep timer "end-of-song" is active — let the song end naturally
      const sleepTimerState = useSleepTimerStore.getState();
      const blockCrossfadeForSleep = sleepTimerState.isActive && sleepTimerState.mode === 'end-of-song';
      const xfadeSec = Math.max(0, crossfadeDuration || 0);
      if (
        xfadeSec > 0 &&
        elDur >= 30 &&
        elDur > xfadeSec * 2 &&
        cur >= elDur - xfadeSec &&
        !isCrossfading &&
        !blockCrossfadeForSleep
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
      // Guard: strictly ignore ended event if transition occurred within 3 seconds
      if (now - lastTransitionTimestamp < 3000) return;

      const elDur = (el.duration && !isNaN(el.duration) && isFinite(el.duration) && el.duration > 0)
        ? el.duration
        : (usePlayerStore.getState().currentTrack?.duration || 0);

      // Guard: only ignore if currentTime is suspiciously early (< 15s into a >30s song) and HTML5 ended flag is false
      const cur = el.currentTime || 0;
      if (elDur > 30 && cur < 15 && !el.ended) {
        console.warn('Ignoring premature ended event:', cur, elDur);
        return;
      }

      // ── Sleep Timer: "End of Song" mode intercept ──
      const sleepState = useSleepTimerStore.getState();
      if (sleepState.isActive && sleepState.mode === 'end-of-song') {
        // Song ended — stop playback, cancel the timer, restore volume
        usePlayerStore.getState().setIsPlaying(false);
        sleepState.cancelTimer();
        return; // Do NOT advance to next track
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
        useAudioStateStore.setState({ isLoading: false });

        // Auto-recover on audio stream error by advancing to next track silently
        const { queue, currentIndex, isAutoplayEnabled, nextTrack } = usePlayerStore.getState();
        if (isAutoplayEnabled || currentIndex < queue.length - 1) {
          setTimeout(() => {
            nextTrack();
          }, 1000);
        } else {
          usePlayerStore.getState().setIsPlaying(false);
        }
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
      const isFading = useSleepTimerStore.getState().isFadingOut;
      if (!isFading) {
        activeGain.gain.setValueAtTime(volume, audioCtx.currentTime);
      }
    }
  }, [volume]);

  // Handle native Web Audio Sleep Timer fade-out
  useEffect(() => {
    const unsub = useSleepTimerStore.subscribe((state, prevState) => {
      if (state.isFadingOut && !prevState.isFadingOut) {
        if (!audioCtx || !gainA || !gainB) return;
        const activeGain = currentActive === 'A' ? gainA : gainB;
        const now = audioCtx.currentTime;
        activeGain.gain.setValueAtTime(activeGain.gain.value, now);
        activeGain.gain.linearRampToValueAtTime(0.001, now + 15);
      } else if (!state.isFadingOut && prevState.isFadingOut) {
        if (!audioCtx || !gainA || !gainB) return;
        const activeGain = currentActive === 'A' ? gainA : gainB;
        const now = audioCtx.currentTime;
        activeGain.gain.cancelScheduledValues(now);
        activeGain.gain.setValueAtTime(volume, now);
      }
    });
    return () => unsub();
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

      const targetUrl = await resolveStreamUrl(currentTrack);

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
          if (targetUrl && !targetUrl.startsWith('blob:')) {
            import('@/lib/audioCache')
              .then(({ autoCacheTrackAudio }) => autoCacheTrackAudio(trackId, targetUrl))
              .catch(() => {});
          }
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
        if (targetUrl && !targetUrl.startsWith('blob:')) {
          import('@/lib/audioCache')
            .then(({ autoCacheTrackAudio }) => autoCacheTrackAudio(trackId, targetUrl))
            .catch(() => {});
        }
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
    isLoading,
    togglePlay,
    seek,
  };
}
