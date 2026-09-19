'use client';

import React from 'react';
import { Play, Shuffle, Edit3, Trash2, Sparkles } from 'lucide-react';
import { Track } from '@/store/usePlayerStore';

interface PlaylistActionBarProps {
  tracks: Track[];
  onPlayAll: () => void;
  onSmartShuffle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isPlayingThis?: boolean;
}

function formatTotalDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) return '0 min';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) {
    return `${hrs} hr ${mins} min`;
  }
  return `${mins} min`;
}

export function PlaylistActionBar({
  tracks,
  onPlayAll,
  onSmartShuffle,
  onEdit,
  onDelete,
  isPlayingThis = false,
}: PlaylistActionBarProps) {
  const count = tracks.length;
  const totalSeconds = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-4 mb-6 border-b border-white/5">
      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        {/* Play All Button */}
        <button
          onClick={onPlayAll}
          disabled={count === 0}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-primary hover:bg-primary/90 text-black font-semibold text-sm shadow-[0_4px_20px_rgba(168,85,247,0.4)] hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
          title="Play in order"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Play</span>
        </button>

        {/* Smart Shuffle Button */}
        <button
          onClick={onSmartShuffle}
          disabled={count === 0}
          className="group relative flex items-center gap-2 px-5 py-3 rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold text-sm border border-white/10 hover:border-primary/50 shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
          title="Smart Shuffle with anti-clustering"
        >
          <Shuffle className="w-4 h-4 text-primary group-hover:rotate-180 transition-transform duration-500" />
          <span>Smart Shuffle</span>
          <span className="flex h-1.5 w-1.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
        </button>

        {/* Edit Playlist */}
        {onEdit && (
          <button
            onClick={onEdit}
            className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white border border-white/10 hover:scale-105 active:scale-95 transition-all"
            title="Edit Playlist"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        )}

        {/* Delete Playlist */}
        {onDelete && (
          <button
            onClick={onDelete}
            className="p-3 rounded-full bg-white/5 hover:bg-red-500/20 text-muted-foreground hover:text-red-400 border border-white/10 hover:scale-105 active:scale-95 transition-all"
            title="Delete Playlist"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Track count & duration summary */}
      <div className="text-xs text-muted-foreground flex items-center gap-2">
        <span>{count} track{count !== 1 ? 's' : ''}</span>
        {totalSeconds > 0 && (
          <>
            <span>•</span>
            <span>{formatTotalDuration(totalSeconds)}</span>
          </>
        )}
      </div>
    </div>
  );
}
