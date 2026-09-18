'use client';

import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Mic2, Heart, Plus } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useFavorites, useAddFavorite, useRemoveFavorite, useLyrics } from '@/hooks/queries';
import { useState } from 'react';
import { toast } from 'sonner';
import { useUIStore } from '@/store/useUIStore';

function formatTime(seconds: number) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function PlayerBar() {
  const router = useRouter();
  const pathname = usePathname();
  const isLyricsPage = pathname === '/lyrics';
  const { currentTrack, isPlaying, volume, setVolume, playNext, playPrevious } = usePlayerStore();
  const { currentTime, duration, isLoading, togglePlay, seek } = useAudioPlayer();
  
  const { openPlaylistModal } = useUIStore();
  const { data: favorites } = useFavorites();
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();

  const { data: lyricsData, isLoading: isLyricsLoading } = useLyrics(currentTrack?.title, currentTrack?.artist, currentTrack?.duration);
  const hasLyrics = !!lyricsData && lyricsData.lyrics && lyricsData.lyrics.length > 0;

  const isFavorite = currentTrack && favorites?.some(f => f.providerTrackId === currentTrack.providerTrackId);

  const handleFavoriteToggle = () => {
    if (!currentTrack) return;
    if (isFavorite) {
      removeFavorite.mutate(currentTrack.providerTrackId, {
        onSuccess: () => toast.success('Removed from favorites')
      });
    } else {
      addFavorite.mutate(currentTrack, {
        onSuccess: () => toast.success('Added to favorites')
      });
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const bounds = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - bounds.left) / bounds.width;
    seek(percent * duration);
  };

  const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const bounds = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - bounds.left) / bounds.width;
    setVolume(Math.max(0, Math.min(1, percent)));
  };

  const toggleMute = () => {
    if (volume > 0) setVolume(0);
    else setVolume(1);
  };

  return (
    <div className="h-24 glass border-t border-white/10 flex items-center justify-between px-6 z-50">
      {/* Track Info */}
      <div className="w-1/3 flex items-center gap-4">
        <div className="w-14 h-14 bg-white/5 rounded-md flex items-center justify-center overflow-hidden border border-white/10">
          {currentTrack?.albumArt ? (
            <img src={currentTrack.albumArt} alt="Album Art" className="w-full h-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/10" />
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-white line-clamp-1">{currentTrack?.title || 'No track selected'}</span>
          <span className="text-xs text-muted-foreground line-clamp-1">{currentTrack?.artist || 'Unknown Artist'}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center justify-center flex-1 max-w-md gap-2">
        <div className="flex items-center gap-6">
          <button onClick={playPrevious} className="text-muted-foreground hover:text-white transition-colors">
            <SkipBack className="w-5 h-5 fill-current" />
          </button>
          <button 
            onClick={togglePlay}
            disabled={!currentTrack || isLoading}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
          >
            {isLoading ? (
               <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current translate-x-0.5" />
            )}
          </button>
          <button onClick={playNext} className="text-muted-foreground hover:text-white transition-colors">
            <SkipForward className="w-5 h-5 fill-current" />
          </button>
        </div>
        <div className="w-full flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground w-8 text-right">{formatTime(currentTime)}</span>
          <div 
            className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden cursor-pointer group relative"
            onClick={handleSeek}
          >
            <div 
              className="absolute top-0 left-0 h-full bg-primary group-hover:bg-accent transition-colors"
              style={{ width: `${progressPercent}%` }} 
            />
          </div>
          <span className="text-[10px] text-muted-foreground w-8">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Actions & Volume */}
      <div className="w-1/3 flex items-center justify-end gap-3">
        {currentTrack ? (
          isLyricsPage ? (
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && window.history.length > 1) {
                  router.back();
                } else {
                  router.push('/');
                }
              }}
              className="transition-all duration-300 p-1.5 rounded-lg flex items-center justify-center hover:scale-110 active:scale-95 text-primary bg-primary/20 shadow-[0_0_15px_rgba(168,85,247,0.4)] ring-1 ring-primary/40 cursor-pointer"
              title="Minimize Lyrics (Return to previous page)"
            >
              <Mic2 className="w-5 h-5 text-primary drop-shadow-[0_0_8px_rgba(168,85,247,0.9)]" />
            </button>
          ) : (
            <Link
              href="/lyrics"
              className={`transition-all duration-300 p-1.5 rounded-lg flex items-center justify-center hover:scale-110 active:scale-95 ${
                hasLyrics
                  ? 'text-primary drop-shadow-[0_0_10px_rgba(168,85,247,0.85)] hover:text-white'
                  : isLyricsLoading
                  ? 'text-muted-foreground animate-pulse'
                  : 'text-muted-foreground hover:text-white'
              }`}
              title={
                hasLyrics
                  ? 'Lyrics (Available)'
                  : isLyricsLoading
                  ? 'Searching lyrics...'
                  : 'Lyrics'
              }
            >
              <Mic2 className={`w-5 h-5 ${hasLyrics ? 'text-primary drop-shadow-[0_0_8px_rgba(168,85,247,0.9)]' : ''}`} />
            </Link>
          )
        ) : (
          <div className="text-muted-foreground/30 cursor-not-allowed p-1.5" title="No track playing">
            <Mic2 className="w-5 h-5" />
          </div>
        )}
        <button 
          onClick={handleFavoriteToggle}
          className="text-muted-foreground hover:text-white transition-colors hover:scale-110 active:scale-95" 
          title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
        >
          <Heart className={`w-5 h-5 ${isFavorite ? 'fill-primary text-primary' : ''}`} />
        </button>
        <button 
          onClick={() => openPlaylistModal(currentTrack)}
          className="text-muted-foreground hover:text-white transition-colors hover:scale-110 active:scale-95" 
          title="Add to Playlist"
        >
          <Plus className="w-5 h-5" />
        </button>

        <div className="w-px h-4 bg-white/10 mx-2" />

        <button onClick={toggleMute} className="text-muted-foreground hover:text-white transition-colors">
          {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
        <div 
          className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer group relative"
          onClick={handleVolumeClick}
        >
          <div 
            className="absolute top-0 left-0 h-full bg-white group-hover:bg-primary transition-colors" 
            style={{ width: `${volume * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
