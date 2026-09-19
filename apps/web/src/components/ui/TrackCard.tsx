'use client';

import React from 'react';
import Link from 'next/link';
import { Play, Zap } from 'lucide-react';
import { usePlayerStore, Track } from '@/store/usePlayerStore';
import { TrackMenu } from './TrackMenu';
import { warmupStandbyTrack } from '@/hooks/useAudioPlayer';

interface TrackCardProps {
  track: Track;
  contextQueue?: Track[];
  trackIndex?: number;
  onRemoveFromPlaylist?: () => void;
}

export function TrackCard({ track, contextQueue, trackIndex, onRemoveFromPlaylist }: TrackCardProps) {
  const { setCurrentTrack, setQueue, warmedTrackIds } = usePlayerStore();
  const id = track.providerTrackId || track.id || '';
  const isWarmed = Boolean(id && warmedTrackIds.includes(id));

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (contextQueue && contextQueue.length > 0) {
      const startIndex =
        typeof trackIndex === 'number' && trackIndex >= 0
          ? trackIndex
          : contextQueue.findIndex((t) => (t.providerTrackId || t.id) === id);
      setQueue(contextQueue, startIndex !== -1 ? startIndex : 0);
    } else {
      setCurrentTrack(track);
    }
  };

  const handleWarmup = () => {
    warmupStandbyTrack(track);
  };

  return (
    <div
      onClick={handlePlay}
      onMouseEnter={handleWarmup}
      onPointerDown={handleWarmup}
      className={`group relative bg-white/5 border rounded-xl overflow-hidden hover:bg-white/10 transition-all duration-200 cursor-pointer ${
        isWarmed ? 'border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'border-white/10'
      }`}
    >
      {/* ⚡ Instant Play Ready Badge */}
      {isWarmed && (
        <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 text-[10px] font-semibold backdrop-blur-md shadow-lg animate-in fade-in zoom-in duration-200">
          <Zap className="w-2.5 h-2.5 fill-current" />
          <span>Instant</span>
        </div>
      )}

      {/* 3-Dot Context Menu in Top-Right Corner */}
      <div className="absolute top-2.5 right-2.5 z-20">
        <TrackMenu track={track} onRemoveFromPlaylist={onRemoveFromPlaylist} />
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
          {track.artist ? (
            <Link
              href={`/artist/${encodeURIComponent((track as any).artistId || track.artist)}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:text-white hover:underline transition-colors"
            >
              {track.artist}
            </Link>
          ) : (
            'Unknown Artist'
          )}
        </p>
      </div>
    </div>
  );
}
