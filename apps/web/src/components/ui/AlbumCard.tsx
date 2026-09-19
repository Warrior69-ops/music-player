'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Disc3, Play, Pause, Loader2 } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
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
        setQueue(albumData.tracks, 0);
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
      className="group relative flex flex-col p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/20 transition-all duration-300 hover:shadow-2xl cursor-pointer select-none"
    >
      {/* Square Cover Artwork with Floating Play Button */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black/40 mb-3 shadow-lg group-hover:shadow-primary/20 transition-all duration-300">
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
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-900/30 to-black">
            <Disc3 className="w-12 h-12 text-white/30" />
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
          className={`absolute bottom-3 right-3 w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 z-10 cursor-pointer ${
            isThisAlbumPlaying || isLoading
              ? 'opacity-100 translate-y-0 shadow-[0_0_20px_rgba(236,72,153,0.6)]'
              : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 shadow-xl'
          }`}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-primary-foreground" />
          ) : isThisAlbumPlaying ? (
            <Pause className="w-5 h-5 fill-current text-primary-foreground" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5 text-primary-foreground" />
          )}
        </button>
      </div>

      {/* Album Title */}
      <h3 className="text-sm font-semibold text-white group-hover:text-primary transition-colors line-clamp-1">
        {album.title}
      </h3>

      {/* Subtitle: Artist & Year */}
      <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
        {album.year && (
          <span className="font-medium text-white/70">{album.year}</span>
        )}
        {album.year && album.artist && <span>•</span>}
        {album.artist && (
          <span className="truncate">{album.artist}</span>
        )}
      </div>
    </div>
  );
};
