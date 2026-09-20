'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Disc3, Play, Pause, Loader2 } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { EqualizerBars } from './EqualizerBars';
import api from '@/lib/api';

interface AlbumCardProps {
  album: {
    id: string;
    title: string;
    artist?: string;
    artistId?: string;
    year?: string;
    thumbnail?: string;
    type?: string;
  };
}

export const AlbumCard: React.FC<AlbumCardProps> = ({ album }) => {
  const router = useRouter();
  const { currentTrack, isPlaying, setQueue, setIsPlaying } = usePlayerStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleMouseEnter = () => {
    // Prime the album details cache & prefetch batch in advance
    api.get(`/music/album/${encodeURIComponent(album.id)}`).catch(() => {});
  };

  // Check if current active song belongs to this album
  const isThisAlbumPlaying =
    isPlaying &&
    (currentTrack?.album === album.title || (currentTrack as any)?.albumId === album.id);

  const handlePlayClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isThisAlbumPlaying) {
      setIsPlaying(false);
      return;
    }

    // If this album was already loaded and paused, resume it
    if (
      !isPlaying &&
      currentTrack &&
      (currentTrack?.album === album.title || (currentTrack as any)?.albumId === album.id)
    ) {
      setIsPlaying(true);
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.get(`/music/album/${encodeURIComponent(album.id)}`);
      const albumData = res.data?.data;
      if (albumData?.tracks?.length > 0) {
        setQueue(albumData.tracks, 0, {
          type: 'album',
          name: album.title || albumData.title,
          id: album.id,
        });
      }
    } catch (err) {
      console.error('Failed to play album tracks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardClick = () => {
    router.push(`/album/${encodeURIComponent(album.id)}`);
  };

  return (
    <div
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      className={`group relative flex flex-col p-3.5 rounded-2xl glass-card transition-all duration-300 hover:-translate-y-1 cursor-pointer select-none ${
        isThisAlbumPlaying
          ? 'border-purple-500/60 ring-1 ring-purple-500/40 shadow-[0_12px_35px_rgba(0,0,0,0.7),0_0_24px_rgba(139,92,246,0.35)] bg-purple-950/30'
          : 'border-white/10 hover:border-purple-400/40 hover:shadow-[0_12px_30px_rgba(0,0,0,0.6),0_0_20px_rgba(139,92,246,0.25)]'
      }`}
    >
      {/* Square Cover Artwork with Floating Play Button */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-purple-950/40 mb-3 shadow-lg group-hover:shadow-purple-500/20 transition-all duration-300">
        {album.thumbnail ? (
          <Image
            src={album.thumbnail}
            alt={album.title}
            fill
            unoptimized
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 160px, 200px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-950/50 to-purple-950/70">
            <Disc3 className="w-12 h-12 text-purple-300/30" />
          </div>
        )}

        {/* Status Badge: Equalizer when playing */}
        {isThisAlbumPlaying && (
          <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-950/90 text-purple-200 border border-purple-500/50 text-[10px] font-semibold backdrop-blur-md shadow-[0_0_12px_rgba(139,92,246,0.45)]">
            <EqualizerBars isPlaying={isPlaying} size="xs" />
            <span className="tracking-wide uppercase text-[9px] font-bold text-purple-300">Album</span>
          </div>
        )}

        {/* Ambient Dark Overlay on hover */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Floating Play Button Overlay: Starts playback without opening album */}
        <button
          type="button"
          aria-label={isThisAlbumPlaying ? `Pause ${album.title}` : `Play ${album.title}`}
          onClick={handlePlayClick}
          onPointerDown={(e) => e.stopPropagation()}
          className={`absolute bottom-3 right-3 w-11 h-11 rounded-full bg-gradient-to-tr from-purple-400 via-white to-purple-200 text-black flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 z-10 cursor-pointer ${
            isThisAlbumPlaying || isLoading
              ? 'opacity-100 translate-y-0 shadow-[0_0_20px_rgba(168,85,247,0.7)]'
              : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 shadow-xl'
          }`}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-black" />
          ) : isThisAlbumPlaying ? (
            <Pause className="w-5 h-5 fill-current text-black" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5 text-black" />
          )}
        </button>
      </div>

      {/* Album Title */}
      <h3
        className={`text-sm font-semibold truncate transition-colors ${
          isThisAlbumPlaying
            ? 'text-purple-300 drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]'
            : 'text-white group-hover:text-purple-200'
        }`}
      >
        {album.title}
      </h3>

      {/* Subtitle: Artist & Year */}
      <div className="flex items-center gap-1.5 mt-1 text-xs text-purple-300/60">
        {album.year && (
          <span className="font-medium text-purple-200/80">{album.year}</span>
        )}
        {album.year && album.artist && <span>•</span>}
        {album.artist && (
          <span className="truncate">{album.artist}</span>
        )}
      </div>
    </div>
  );
};
