'use client';

import React from 'react';
import { Play } from 'lucide-react';
import { usePlayerStore, Track } from '@/store/usePlayerStore';
import { TrackMenu } from './TrackMenu';

interface TrackCardProps {
  track: Track;
}

export function TrackCard({ track }: TrackCardProps) {
  const { setCurrentTrack } = usePlayerStore();

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentTrack(track);
  };

  return (
    <div
      onClick={handlePlay}
      className="group relative bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/10 transition-colors cursor-pointer"
    >
      {/* 3-Dot Context Menu in Top-Right Corner */}
      <div className="absolute top-2.5 right-2.5 z-20">
        <TrackMenu track={track} />
      </div>

      <div className="aspect-square relative overflow-hidden">
        {track.albumArt ? (
          <img
            src={track.albumArt}
            alt={track.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-white/5 flex items-center justify-center">
            <span className="text-muted-foreground text-xs">No Art</span>
          </div>
        )}

        {/* Play Button Overlay (Only Play Button) */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
          <button
            onClick={handlePlay}
            className="w-12 h-12 rounded-full bg-primary hover:bg-accent hover:scale-110 flex items-center justify-center text-black shadow-2xl scale-90 group-hover:scale-100 transition-all duration-200"
            title="Play"
          >
            <Play className="w-5 h-5 translate-x-0.5 fill-current" />
          </button>
        </div>
      </div>

      {/* Track Title & Artist */}
      <div className="p-3.5">
        <h3 className="font-semibold text-white truncate text-sm" title={track.title}>
          {track.title}
        </h3>
        <p className="text-xs text-muted-foreground truncate mt-0.5" title={track.artist}>
          {track.artist}
        </p>
      </div>
    </div>
  );
}
