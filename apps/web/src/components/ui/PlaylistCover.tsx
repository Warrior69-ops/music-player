'use client';

import React from 'react';
import { Library, Music2 } from 'lucide-react';
import { Track } from '@/store/usePlayerStore';

interface PlaylistCoverProps {
  tracks?: Track[] | any[];
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
}

export function PlaylistCover({ tracks = [], className = '', size = 'md' }: PlaylistCoverProps) {
  // Extract up to 4 album arts with valid URLs
  const validTracks = tracks.filter((t) => Boolean(t && t.albumArt));
  const count = validTracks.length;

  if (count >= 4) {
    const topFour = validTracks.slice(0, 4);
    return (
      <div
        className={`relative aspect-square rounded-xl overflow-hidden grid grid-cols-2 grid-rows-2 border border-white/10 bg-zinc-900 shadow-xl select-none ${className}`}
      >
        {topFour.map((t, idx) => (
          <div key={idx} className="relative w-full h-full overflow-hidden bg-white/5">
            <img
              src={t.albumArt}
              alt={t.title || `Track ${idx + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    );
  }

  if (count >= 1) {
    return (
      <div
        className={`relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-zinc-900 shadow-xl select-none ${className}`}
      >
        <img
          src={validTracks[0].albumArt}
          alt={validTracks[0].title || 'Playlist Cover'}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  // Fallback for empty or art-less playlists
  return (
    <div
      className={`relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-gradient-to-br from-purple-900/40 via-zinc-900 to-primary/20 flex items-center justify-center shadow-xl select-none ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
        <Music2 className="w-6 h-6 text-primary" />
      </div>
    </div>
  );
}
