import { useState, useEffect, useRef, useCallback } from 'react';
import { usePlayerStore } from '@/store/usePlayerStore';
import api from '@/lib/api';

let globalAudio: HTMLAudioElement | null = null;
let currentLoadedTrackId: string | null = null;

export function useAudioPlayer() {
  const { currentTrack, isPlaying, setIsPlaying, volume, playNext } = usePlayerStore();

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const playNextRef = useRef(playNext);
  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  // Initialize audio element
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (!globalAudio) {
      globalAudio = new Audio();
    }
    
    globalAudio.volume = volume;

    const setAudioData = () => {
      setDuration(globalAudio!.duration);
      setCurrentTime(globalAudio!.currentTime);
      setIsLoading(false);
    };

    const setAudioTime = () => setCurrentTime(globalAudio!.currentTime);
    const onEnded = () => playNextRef.current();
    const onWaiting = () => setIsLoading(true);
    const onPlaying = () => setIsLoading(false);

    globalAudio.addEventListener('loadeddata', setAudioData);
    globalAudio.addEventListener('timeupdate', setAudioTime);
    globalAudio.addEventListener('ended', onEnded);
    globalAudio.addEventListener('waiting', onWaiting);
    globalAudio.addEventListener('playing', onPlaying);

    // Sync initial state if globalAudio is already playing something
    setDuration(globalAudio.duration || 0);
    setCurrentTime(globalAudio.currentTime || 0);

    return () => {
      if (globalAudio) {
        globalAudio.removeEventListener('loadeddata', setAudioData);
        globalAudio.removeEventListener('timeupdate', setAudioTime);
        globalAudio.removeEventListener('ended', onEnded);
        globalAudio.removeEventListener('waiting', onWaiting);
        globalAudio.removeEventListener('playing', onPlaying);
      }
    };
  }, []);

  // Handle track change
  useEffect(() => {
    const fetchAndPlayStream = async () => {
      if (!currentTrack || !globalAudio) return;
      
      if (currentLoadedTrackId === currentTrack.providerTrackId) return;
      currentLoadedTrackId = currentTrack.providerTrackId;
      
      setIsLoading(true);
      setCurrentTime(0);

      try {
        let url = currentTrack.audioUrl;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        
        if (currentTrack.provider === 'youtube') {
          // Send YouTube requests directly to our backend proxy to avoid 403 IP-Binding errors
          url = `${apiUrl}/music/proxy/youtube/${currentTrack.providerTrackId}`;
        } else if (!url) {
          // Only fetch from backend stream endpoint if audioUrl is missing for Jamendo/Audius
          const response = await api.get(`/music/stream/${currentTrack.provider}/${currentTrack.providerTrackId}`);
          url = response.data.data;
        }

        if (url && globalAudio.src !== url) {
          globalAudio.src = url;
          globalAudio.load();
          if (isPlaying) {
            globalAudio.play().catch(console.error);
          }
          
          // Log history in the background
          api.post('/history', currentTrack).catch(console.error);
        }
      } catch (error) {
        console.error('Failed to play track:', error);
        setIsPlaying(false);
        currentLoadedTrackId = null;
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndPlayStream();
  }, [currentTrack]);

  // Handle Play/Pause
  useEffect(() => {
    if (!globalAudio || !globalAudio.src) return;
    
    if (isPlaying && globalAudio.paused) {
      globalAudio.play().catch(console.error);
    } else if (!isPlaying && !globalAudio.paused) {
      globalAudio.pause();
    }
  }, [isPlaying]);

  // Handle volume change
  useEffect(() => {
    if (globalAudio) {
      globalAudio.volume = volume;
    }
  }, [volume]);

  const togglePlay = useCallback(() => {
    if (!currentTrack) return;
    setIsPlaying(!isPlaying);
  }, [currentTrack, isPlaying, setIsPlaying]);

  const seek = useCallback((time: number) => {
    if (globalAudio) {
      globalAudio.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  return {
    currentTime,
    duration: duration || currentTrack?.duration || 0,
    isLoading,
    togglePlay,
    seek,
  };
}
