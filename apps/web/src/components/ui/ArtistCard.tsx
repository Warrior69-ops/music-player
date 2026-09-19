'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { UserCheck, Sparkles } from 'lucide-react';
import api from '@/lib/api';

interface ArtistCardProps {
  artist: {
    id: string;
    name: string;
    subscribers?: string;
    thumbnail?: string;
  };
}

export const ArtistCard: React.FC<ArtistCardProps> = ({ artist }) => {
  const handleMouseEnter = () => {
    // Prime the artist page cache in advance
    api.get(`/music/artist/${encodeURIComponent(artist.id)}`).catch(() => {});
  };

  return (
    <Link
      href={`/artist/${encodeURIComponent(artist.id)}`}
      onMouseEnter={handleMouseEnter}
      className="group flex flex-col items-center p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-primary/40 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(236,72,153,0.15)] text-center cursor-pointer"
    >
      {/* Circular Avatar with Glowing Ring */}
      <div className="relative w-32 h-32 md:w-36 md:h-36 mb-4 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-primary/80 transition-all duration-300 shadow-xl group-hover:scale-105">
        {artist.thumbnail ? (
          <Image
            src={artist.thumbnail}
            alt={artist.name}
            fill
            unoptimized
            className="object-cover group-hover:scale-110 transition-transform duration-500"
            sizes="(max-width: 768px) 128px, 144px"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 to-purple-600/30 flex items-center justify-center">
            <UserCheck className="w-12 h-12 text-white/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>

      {/* Artist Name & Subscribers */}
      <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors line-clamp-1 w-full px-1">
        {artist.name}
      </h3>
      <div className="flex items-center justify-center gap-1.5 mt-1 text-xs text-muted-foreground">
        <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] uppercase font-semibold tracking-wider text-primary">
          Artist
        </span>
        {artist.subscribers && (
          <span className="truncate max-w-[120px]">{artist.subscribers}</span>
        )}
      </div>
    </Link>
  );
};
