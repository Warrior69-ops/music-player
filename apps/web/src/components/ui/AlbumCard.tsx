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
      style={{
        WebkitBackdropFilter: 'blur(24px) saturate(135%)',
        backdropFilter: 'blur(24px) saturate(135%)',
      }}
      className={`group relative aspect-square w-full rounded-2xl liquid-glass-card overflow-hidden transition-all duration-300 hover:-translate-y-1 cursor-pointer select-none transform-gpu will-change-transform ${
        isThisAlbumPlaying
          ? 'border-purple-500/70 ring-1 ring-purple-500/50 shadow-[0_12px_35px_rgba(0,0,0,0.7),0_0_24px_rgba(139,92,246,0.35)]'
          : 'border-white/12 hover:border-purple-400/40 hover:shadow-[0_12px_30px_rgba(0,0,0,0.6),0_0_20px_rgba(139,92,246,0.25)]'
      }`}
    >
      {/* ── Status Badge (Top-Left) ─────────────────────────────────── */}
      {isThisAlbumPlaying && (
        <div className="absolute top-2.5 left-2.5 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full liquid-glass-pill text-purple-200 border border-purple-500/50 text-[10px] font-semibold shadow-[0_0_12px_rgba(139,92,246,0.45)] pointer-events-none">
          <EqualizerBars isPlaying={isPlaying} size="xs" />
          <span className="tracking-wide uppercase text-[9px] font-bold text-purple-300">Album</span>
        </div>
      )}

      {/* ── Square Cover Artwork Layer (Blurred in Default Glass State, Clear on Hover) ── */}
      <div className="absolute inset-0 overflow-hidden bg-purple-950/40">
        {album.thumbnail ? (
          <Image
            src={album.thumbnail}
            alt={album.title}
            fill
            unoptimized
            className="object-cover filter blur-[14px] saturate-[130%] scale-110 group-hover:filter-none group-hover:scale-100 transition-all duration-500 ease-out transform-gpu will-change-transform"
            sizes="(max-width: 768px) 180px, 240px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-950/50 to-purple-950/70">
            <Disc3 className="w-12 h-12 text-purple-300/30" />
          </div>
        )}

        {/* Ambient Inner Glass Rim */}
        <div className="absolute inset-0 ring-1 ring-inset ring-white/15 pointer-events-none z-10" />

        {/* Floating Play Button Overlay on Hover */}
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <button
            type="button"
            aria-label={isThisAlbumPlaying ? `Pause ${album.title}` : `Play ${album.title}`}
            onClick={handlePlayClick}
            onPointerDown={(e) => e.stopPropagation()}
            className={`w-12 h-12 rounded-full bg-gradient-to-tr from-purple-400 via-white to-purple-200 text-black flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 pointer-events-auto cursor-pointer ${
              isThisAlbumPlaying || isLoading
                ? 'opacity-100 scale-100 shadow-[0_0_25px_rgba(168,85,247,0.85)]'
                : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 shadow-xl'
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
      </div>

      {/* ── Integrated Liquid Glass Typography Plate (Directly on Artwork) ── */}
      <div className="absolute bottom-0 inset-x-0 p-3 z-20 liquid-glass-card-overlay rounded-b-2xl select-none">
        <h3
          className={`font-bold truncate text-xs sm:text-sm drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.9)] transition-colors ${
            isThisAlbumPlaying
              ? 'text-purple-300 drop-shadow-[0_0_10px_rgba(168,85,247,0.7)]'
              : 'text-white group-hover:text-purple-200'
          }`}
          title={album.title}
        >
          {album.title}
        </h3>

        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] sm:text-xs text-purple-200/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          {album.year && (
            <span className="font-medium text-purple-200/90">{album.year}</span>
          )}
          {album.year && album.artist && <span>•</span>}
          {album.artist && (
            <span className="truncate max-w-[140px]">{album.artist}</span>
          )}
        </div>
      </div>
    </div>
  );
};
