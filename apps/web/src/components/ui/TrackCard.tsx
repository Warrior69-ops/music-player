'use client';

import React from 'react';
import Link from 'next/link';
import { Play, Pause } from 'lucide-react';
import { usePlayerStore, Track, QueueSource } from '@/store/usePlayerStore';
import { TrackMenu } from './TrackMenu';
import { EqualizerBars } from './EqualizerBars';
import { warmupStandbyTrack } from '@/hooks/useAudioPlayer';

interface TrackCardProps {
  track: Track;
  contextQueue?: Track[];
  trackIndex?: number;
  queueSource?: QueueSource;
  onRemoveFromPlaylist?: () => void;
}

export function TrackCard({ track, contextQueue, trackIndex, queueSource, onRemoveFromPlaylist }: TrackCardProps) {
  const { currentTrack, isPlaying, setCurrentTrack, setQueue } = usePlayerStore();
  const id = track.providerTrackId || track.id || '';
  const currentId = currentTrack?.providerTrackId || currentTrack?.id || '';
  const isCurrentTrack = Boolean(id && currentId === id);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (contextQueue && contextQueue.length > 0) {
      const startIndex =
        typeof trackIndex === 'number' && trackIndex >= 0
          ? trackIndex
          : contextQueue.findIndex((t) => (t.providerTrackId || t.id) === id);
      setQueue(contextQueue, startIndex !== -1 ? startIndex : 0, queueSource);
    } else {
      setCurrentTrack(track, queueSource);
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
      className={`group relative glass-card rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 ${
        isCurrentTrack
          ? 'border-purple-500/50 ring-1 ring-purple-500/30 shadow-lg bg-purple-950/20'
          : 'border-white/10 hover:border-purple-400/30 hover:shadow-xl'
      }`}
    >
      {/* ── Status Badges Overlay (Top-Left) ─────────────────────────── */}
      <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5">
        {/* Equalizer Playing Indicator Badge */}
        {isCurrentTrack && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/80 text-purple-200 border border-purple-500/40 text-[10px] font-semibold backdrop-blur-md shadow-md">
            <EqualizerBars isPlaying={isPlaying} size="xs" />
            <span className="tracking-wide uppercase text-[9px] font-bold text-purple-300">
              {isPlaying ? 'Playing' : 'Paused'}
            </span>
          </div>
        )}
      </div>

      {/* ── 3-Dot Context Menu (Top-Right) ───────────────────────────── */}
      <div className="absolute top-2.5 right-2.5 z-20">
        <TrackMenu track={track} onRemoveFromPlaylist={onRemoveFromPlaylist} />
      </div>

      {/* ── Artwork Container ────────────────────────────────────────── */}
      <div className="aspect-square relative overflow-hidden bg-purple-950/40">
        {track.albumArt ? (
          <img
            src={track.albumArt}
            alt={track.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-950/50 to-purple-950/70">
            <span className="text-purple-300/60 text-xs font-medium">No Artwork</span>
          </div>
        )}

        {/* Ambient Inner Glass Rim */}
        <div className="absolute inset-0 ring-1 ring-inset ring-white/10 pointer-events-none" />

        {/* Quick-Play Circular Floating Button on Hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
          <button
            onClick={handlePlay}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-400 via-white to-purple-200 text-black shadow-[0_0_20px_rgba(168,85,247,0.8)] hover:scale-110 active:scale-95 flex items-center justify-center transition-all duration-200"
            title={isCurrentTrack && isPlaying ? 'Pause' : 'Play'}
          >
            {isCurrentTrack && isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 translate-x-0.5 fill-current" />
            )}
          </button>
        </div>
      </div>

      {/* ── Track Details: Title & Artist ────────────────────────────── */}
      <div className="p-3.5 bg-purple-950/10">
        <h3
          className={`font-semibold truncate text-sm transition-colors ${
            isCurrentTrack
              ? 'text-purple-300 drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]'
              : 'text-white group-hover:text-purple-200'
          }`}
          title={track.title}
        >
          {track.title}
        </h3>
        <p className="text-xs text-purple-300/70 truncate mt-1" title={track.artist}>
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
