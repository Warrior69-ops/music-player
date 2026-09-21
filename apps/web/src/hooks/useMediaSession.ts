'use client';

import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useAudioStateStore, useAudioPlayer } from './useAudioPlayer';

/**
 * Global hook connecting MELØ audio engine to the native browser MediaSession API.
 * Supports Windows 10/11 physical keyboard media keys, Bluetooth headsets, lockscreen
 * controls, and taskbar media popups.
 */
export function useMediaSession() {
  const { currentTrack, isPlaying, setIsPlaying, nextTrack, playPrevious } = usePlayerStore();
  const { seek } = useAudioPlayer();

  const seekRef = useRef(seek);
  useEffect(() => {
    seekRef.current = seek;
  }, [seek]);

  // 1. Synchronize Track Metadata
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    if (!currentTrack) {
      navigator.mediaSession.metadata = null;
      return;
    }

    const art = currentTrack.albumArt || '';
    const artworkList = art
      ? [
          { src: art, sizes: '96x96', type: 'image/png' },
          { src: art, sizes: '128x128', type: 'image/png' },
          { src: art, sizes: '192x192', type: 'image/png' },
          { src: art, sizes: '256x256', type: 'image/png' },
          { src: art, sizes: '512x512', type: 'image/png' },
        ]
      : [];

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title || 'Untitled Track',
      artist: currentTrack.artist || 'Unknown Artist',
      album: currentTrack.album || 'MELØ',
      artwork: artworkList,
    });
  }, [currentTrack]);

  // 2. Synchronize Playback State ('playing' | 'paused')
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  // 3. Synchronize Position State for Scrubbing and Lockscreen Progress Bar
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    if (!('setPositionState' in navigator.mediaSession)) return;

    let lastPositionUpdate = 0;

    const unsubscribe = useAudioStateStore.subscribe((state) => {
      const now = Date.now();
      // Throttle updates to ~4fps for media session to avoid OS overhead
      if (now - lastPositionUpdate < 250) return;
      
      const { currentTime, duration } = state;
      if (duration > 0 && isFinite(duration) && currentTime >= 0 && currentTime <= duration) {
        try {
          navigator.mediaSession!.setPositionState({
            duration: Math.max(1, duration),
            playbackRate: 1,
            position: Math.min(currentTime, duration),
          });
          lastPositionUpdate = now;
        } catch {
          // Silently ignore transient boundary state mismatches
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // 4. Attach Hardware & Lockscreen Media Actions
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    const ms = navigator.mediaSession;

    const playHandler = () => setIsPlaying(true);
    const pauseHandler = () => setIsPlaying(false);
    const prevHandler = () => playPrevious();
    const nextHandler = () => nextTrack();

    const seekToHandler = (details: MediaSessionActionDetails) => {
      if (details.seekTime !== undefined && details.seekTime !== null) {
        seekRef.current(details.seekTime);
      }
    };

    const seekBackwardHandler = (details: MediaSessionActionDetails) => {
      const offset = details.seekOffset || 10;
      const state = useAudioStateStore.getState();
      seekRef.current(Math.max(0, state.currentTime - offset));
    };

    const seekForwardHandler = (details: MediaSessionActionDetails) => {
      const offset = details.seekOffset || 10;
      const state = useAudioStateStore.getState();
      seekRef.current(Math.min(state.duration, state.currentTime + offset));
    };

    try {
      ms.setActionHandler('play', playHandler);
      ms.setActionHandler('pause', pauseHandler);
      ms.setActionHandler('previoustrack', prevHandler);
      ms.setActionHandler('nexttrack', nextHandler);
      ms.setActionHandler('seekto', seekToHandler);
      ms.setActionHandler('seekbackward', seekBackwardHandler);
      ms.setActionHandler('seekforward', seekForwardHandler);
    } catch (e) {
      console.debug('MediaSession handler registration:', e);
    }

    return () => {
      try {
        ms.setActionHandler('play', null);
        ms.setActionHandler('pause', null);
        ms.setActionHandler('previoustrack', null);
        ms.setActionHandler('nexttrack', null);
        ms.setActionHandler('seekto', null);
        ms.setActionHandler('seekbackward', null);
        ms.setActionHandler('seekforward', null);
      } catch {}
    };
  }, [setIsPlaying, nextTrack, playPrevious]);
}
