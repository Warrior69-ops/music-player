import { useState, useEffect, useRef, useCallback } from 'react';
import { usePlayerStore, Track } from '@/store/usePlayerStore';
import api from '@/lib/api';

// Persistent Dual-Audio Nodes for 0ms transitions
let audioA: HTMLAudioElement | null = null;
let audioB: HTMLAudioElement | null = null;
let currentActive: 'A' | 'B' = 'A';

// Web Audio API Context and Twin Gain Nodes
let audioCtx: AudioContext | null = null;
let gainA: GainNode | null = null;
let gainB: GainNode | null = null;
let sourceA: MediaElementAudioSourceNode | null = null;
let sourceB: MediaElementAudioSourceNode | null = null;

let currentLoadedTrackId: string | null = null;
let warmedUpTrackId: string | null = null;

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
  const id = track.providerTrackId || track.id;
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

  // 2. Pre-assign to standby HTML5 Audio node if available
  ensureAudioNodes();
  const standby = currentActive === 'A' ? audioB : audioA;
  if (standby) {
    const targetUrl =
      (track.provider === 'youtube' || !track.provider)
        ? `${apiUrl}/music/proxy/youtube/${id}`
        : track.audioUrl;

    if (targetUrl && standby.src !== targetUrl) {
      standby.src = targetUrl;
      standby.preload = 'auto';
      standby.load();
    }
  }
}

export function useAudioPlayer() {
  const { currentTrack, isPlaying, setIsPlaying, volume, playNext, queue, currentIndex } = usePlayerStore();

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const getActiveAudio = () => (currentActive === 'A' ? audioA : audioB);
  const getStandbyAudio = () => (currentActive === 'A' ? audioB : audioA);

  const playNextRef = useRef(playNext);
  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  // ── Continuous Speculative Queue Pipeline (Always 2 Tracks Ahead) ──────
  // The moment any song starts, immediately warm up the next track onto the standby node
  // and pre-resolve the 2nd next track in parallel so rapid skipping (every 2-3s) is always instant!
  useEffect(() => {
    if (currentIndex === -1 || queue.length === 0) return;

    const nextTrack = queue[currentIndex + 1];
    const afterNextTrack = queue[currentIndex + 2];

    if (nextTrack) {
      warmupStandbyTrack(nextTrack);
    }
    if (afterNextTrack) {
      const id = afterNextTrack.providerTrackId || afterNextTrack.id;
      if (id && (afterNextTrack.provider === 'youtube' || !afterNextTrack.provider)) {
        api.get(`/music/proxy/youtube/${id}/prefetch`).catch(() => {});
      }
    }
  }, [currentIndex, queue]);

  // Initialize Dual-Audio Elements
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!audioA) {
      audioA = new Audio();
      audioA.crossOrigin = 'anonymous';
    }
    if (!audioB) {
      audioB = new Audio();
      audioB.crossOrigin = 'anonymous';
    }

    audioA.volume = volume;
    audioB.volume = volume;

    const setupListeners = (el: HTMLAudioElement, tag: 'A' | 'B') => {
      const isThisActive = () => currentActive === tag;

      const onLoadedData = () => {
        if (isThisActive()) {
          setDuration(el.duration || 0);
          setCurrentTime(el.currentTime || 0);
        }
      };

      const onTimeUpdate = () => {
        if (!isThisActive()) return;
        setCurrentTime(el.currentTime || 0);

        // ── Speculative Next-Track Warmup (Trigger at duration - 15s) ──────
        const d = el.duration || 0;
        const cur = el.currentTime || 0;
        if (d > 20 && cur >= d - 15) {
          const { queue, currentIndex } = usePlayerStore.getState();
          const nextTrack = queue[currentIndex + 1];
          if (nextTrack && nextTrack.providerTrackId && nextTrack.providerTrackId !== warmedUpTrackId) {
            warmedUpTrackId = nextTrack.providerTrackId;
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

            // 1. Silent backend prefetch (warms yt-dlp + RAM buffer)
            if (nextTrack.provider === 'youtube') {
              api.get(`/music/proxy/youtube/${nextTrack.providerTrackId}/prefetch`).catch(() => {});
            }

            // 2. Pre-buffer onto standby audio node
            const standby = tag === 'A' ? audioB : audioA;
            if (standby) {
              const nextUrl =
                nextTrack.provider === 'youtube'
                  ? `${apiUrl}/music/proxy/youtube/${nextTrack.providerTrackId}`
                  : nextTrack.audioUrl;

              if (nextUrl && standby.src !== nextUrl) {
                standby.src = nextUrl;
                standby.preload = 'auto';
                standby.load();
              }
            }
          }
        }
      };

      const onEnded = () => {
        if (isThisActive()) {
          usePlayerStore.getState().nextTrack();
        }
      };

      const onWaiting = () => {
        if (isThisActive()) setIsLoading(true);
      };

      const onCanPlay = () => {
        if (isThisActive()) setIsLoading(false);
      };

      const onPlaying = () => {
        if (isThisActive()) setIsLoading(false);
      };

      const onError = () => {
        if (isThisActive()) {
          const err = el.error;
          if (err) console.error(`HTML5 Audio error on ${tag}:`, { code: err.code, message: err.message });
          setIsLoading(false);
          setIsPlaying(false);
        }
      };

      el.addEventListener('loadeddata', onLoadedData);
      el.addEventListener('timeupdate', onTimeUpdate);
      el.addEventListener('ended', onEnded);
      el.addEventListener('waiting', onWaiting);
      el.addEventListener('canplay', onCanPlay);
      el.addEventListener('playing', onPlaying);
      el.addEventListener('error', onError);

      return () => {
        el.removeEventListener('loadeddata', onLoadedData);
        el.removeEventListener('timeupdate', onTimeUpdate);
        el.removeEventListener('ended', onEnded);
        el.removeEventListener('waiting', onWaiting);
        el.removeEventListener('canplay', onCanPlay);
        el.removeEventListener('playing', onPlaying);
        el.removeEventListener('error', onError);
      };
    };

    const cleanupA = setupListeners(audioA, 'A');
    const cleanupB = setupListeners(audioB, 'B');

    return () => {
      cleanupA();
      cleanupB();
    };
  }, []);

  // Handle Track Change & Dual-Node Seamless Crossfade
  useEffect(() => {
    const fetchAndPlayStream = async () => {
      if (!currentTrack) return;
      if (currentLoadedTrackId === currentTrack.providerTrackId) return;
      currentLoadedTrackId = currentTrack.providerTrackId;

      setIsLoading(true);
      setCurrentTime(0);

      // Initialize audio context on user action
      initAudioContext();
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      let targetUrl = currentTrack.audioUrl;
      if (currentTrack.provider === 'youtube') {
        targetUrl = `${apiUrl}/music/proxy/youtube/${currentTrack.providerTrackId}`;
      } else if (!targetUrl) {
        const response = await api.get(`/music/stream/${currentTrack.provider}/${currentTrack.providerTrackId}`);
        targetUrl = response.data.data;
      }

      const active = getActiveAudio();
      const standby = getStandbyAudio();

      if (!active || !standby || !targetUrl) {
        setIsLoading(false);
        return;
      }

      try {
        // ── Check if Standby Audio was already pre-buffered (0ms Swap!) ─────
        const isStandbyReady = standby.src === targetUrl && standby.readyState >= 1;

        if (isStandbyReady) {
          // Instant 0ms Crossfade Swap
          const prevActive = active;
          const nextActive = standby;

          // Swap active pointer
          currentActive = currentActive === 'A' ? 'B' : 'A';

          if (audioCtx && gainA && gainB) {
            const now = audioCtx.currentTime;
            const activeGain = currentActive === 'A' ? gainA : gainB;
            const outgoingGain = currentActive === 'A' ? gainB : gainA;

            outgoingGain.gain.setValueAtTime(outgoingGain.gain.value, now);
            outgoingGain.gain.linearRampToValueAtTime(0.001, now + 0.8);
            setTimeout(() => {
              prevActive.pause();
              prevActive.currentTime = 0;
            }, 800);

            activeGain.gain.setValueAtTime(0.001, now);
            activeGain.gain.linearRampToValueAtTime(volume, now + 0.8);
          } else {
            prevActive.pause();
            prevActive.currentTime = 0;
          }

          setDuration(nextActive.duration || currentTrack.duration || 0);
          setIsLoading(false);

          // Mark instant launch for visual confirmation in player bar
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
          return;
        }

        // Check if track was warmed in backend RAM buffer
        if (usePlayerStore.getState().warmedTrackIds.includes(currentTrack.providerTrackId)) {
          usePlayerStore.getState().setIsInstantLaunch(true);
          setTimeout(() => {
            usePlayerStore.getState().setIsInstantLaunch(false);
          }, 3500);
        }

        // ── Standard Load onto Active Node ─────────────────────────────────
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
        setIsLoading(false);
        currentLoadedTrackId = null;
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

  // Handle Volume Change
  useEffect(() => {
    if (audioA) audioA.volume = volume;
    if (audioB) audioB.volume = volume;

    if (audioCtx && gainA && gainB) {
      const activeGain = currentActive === 'A' ? gainA : gainB;
      activeGain.gain.setValueAtTime(volume, audioCtx.currentTime);
    }
  }, [volume]);

  const togglePlay = useCallback(() => {
    if (!currentTrack) return;
    setIsPlaying(!isPlaying);
  }, [currentTrack, isPlaying, setIsPlaying]);

  const seek = useCallback((time: number) => {
    const active = getActiveAudio();
    if (active) {
      active.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const active = getActiveAudio();

  return {
    currentTime,
    duration: duration || active?.duration || currentTrack?.duration || 0,
    isLoading,
    togglePlay,
    seek,
  };
}
