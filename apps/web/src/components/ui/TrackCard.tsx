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
      style={{
        WebkitBackdropFilter: 'blur(24px) saturate(135%)',
        backdropFilter: 'blur(24px) saturate(135%)',
      }}
      className={`group relative aspect-square w-full liquid-glass-card rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 transform-gpu will-change-transform ${
        isCurrentTrack
          ? 'border-purple-500/70 ring-1 ring-purple-500/50 shadow-[0_10px_30px_rgba(139,92,246,0.35)]'
          : 'border-white/12 hover:border-purple-400/40 hover:shadow-2xl'
      }`}
    >
      {/* ── Status Badges Overlay (Top-Left) ─────────────────────────── */}
      <div className="absolute top-2.5 left-2.5 z-30 flex items-center gap-1.5 pointer-events-none">
        {/* Equalizer Playing Indicator Badge */}
        {isCurrentTrack && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full liquid-glass-pill text-purple-200 border border-purple-500/50 text-[10px] font-semibold shadow-lg">
            <EqualizerBars isPlaying={isPlaying} size="xs" />
            <span className="tracking-wide uppercase text-[9px] font-bold text-purple-300">
              {isPlaying ? 'Playing' : 'Paused'}
            </span>
          </div>
        )}
      </div>

      {/* ── 3-Dot Context Menu (Top-Right) ───────────────────────────── */}
      <div className="absolute top-2.5 right-2.5 z-30">
        <TrackMenu track={track} onRemoveFromPlaylist={onRemoveFromPlaylist} />
      </div>

      {/* ── Artwork Layer (Blurred in Default Glass State, Clear on Hover) ── */}
      <div className="absolute inset-0 overflow-hidden bg-purple-950/40">
        {track.albumArt ? (
          <img
            src={track.albumArt}
            alt={track.title}
            className="w-full h-full object-cover filter blur-[14px] saturate-[130%] scale-110 group-hover:filter-none group-hover:scale-100 transition-all duration-500 ease-out transform-gpu will-change-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-950/50 to-purple-950/70">
            <span className="text-purple-300/60 text-xs font-medium">No Artwork</span>
          </div>
        )}

        {/* Ambient Inner Glass Rim */}
        <div className="absolute inset-0 ring-1 ring-inset ring-white/15 pointer-events-none z-10" />

        {/* Floating Play / Pause Circular Button at Center on Hover */}
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <button
            onClick={handlePlay}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-400 via-white to-purple-200 text-black shadow-[0_0_25px_rgba(168,85,247,0.85)] hover:scale-110 active:scale-95 flex items-center justify-center transition-all duration-300 pointer-events-auto opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 cursor-pointer"
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

      {/* ── Integrated Liquid Glass Typography Plate (Directly on Artwork) ── */}
      <div className="absolute bottom-0 inset-x-0 p-3 z-20 liquid-glass-card-overlay rounded-b-2xl select-none">
        <h3
          className={`font-bold truncate text-xs sm:text-sm drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.9)] transition-colors ${
            isCurrentTrack
              ? 'text-purple-300 drop-shadow-[0_0_10px_rgba(168,85,247,0.7)]'
              : 'text-white group-hover:text-purple-200'
          }`}
          title={track.title}
        >
          {track.title}
        </h3>
        <p className="text-[11px] sm:text-xs text-purple-200/80 truncate mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" title={track.artist}>
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
