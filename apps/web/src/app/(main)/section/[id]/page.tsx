'use client';

import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Play,
  Shuffle,
  Sparkles,
  Radio,
  Flame,
  History,
  Headphones,
  LayoutGrid,
  ListMusic,
  Clock,
  Music2,
  Pause,
} from 'lucide-react';
import { useHomeShelves, useHistory } from '@/hooks/queries';
import { usePlayerStore, Track, getTrackId } from '@/store/usePlayerStore';
import { TrackCard } from '@/components/ui/TrackCard';
import { TrackMenu } from '@/components/ui/TrackMenu';
import { EqualizerBars } from '@/components/ui/EqualizerBars';
import { smartShuffleTracks } from '@/lib/smartShuffle';

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatTotalTime(totalSeconds: number): string {
  if (!totalSeconds || isNaN(totalSeconds)) return '';
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return `${hours} hr ${mins} min`;
  }
  return `${mins} min`;
}

export default function SectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sectionId = (params?.id as string) || '';

  const { data: shelves, isLoading: isShelvesLoading } = useHomeShelves(true);
  const { data: history, isLoading: isHistoryLoading } = useHistory();
  const { currentTrack, isPlaying, setQueue, setCurrentTrack, setIsPlaying } = usePlayerStore();

  // View Mode: 'cards' (default - premium liquid glass cards) or 'bars' (horizontal list bars)
  const [viewMode, setViewMode] = useState<'cards' | 'bars'>('cards');

  // Find target section
  const sectionData = useMemo(() => {
    if (sectionId === 'history' || sectionId === 'recently-played') {
      return {
        id: 'history',
        title: 'Recently Played',
        description: 'Your recent listening history across all devices and sessions',
        items: history || [],
        icon: <History className="w-6 h-6 text-muted-foreground" />,
      };
    }

    const matchedShelf = shelves?.find((s) => s.id === sectionId);
    if (matchedShelf) {
      let icon = <Flame className="w-6 h-6 text-amber-400" />;
      if (matchedShelf.id === 'shelf-recent-vibe') {
        icon = <Headphones className="w-6 h-6 text-emerald-400" />;
      } else if (matchedShelf.id === 'shelf-1') {
        icon = <Sparkles className="w-6 h-6 text-purple-400" />;
      } else if (matchedShelf.id === 'shelf-2') {
        icon = <Radio className="w-6 h-6 text-cyan-400" />;
      }

      return {
        id: matchedShelf.id,
        title: matchedShelf.title,
        description: matchedShelf.description || 'Personalized curation curated by Nocturne',
        items: matchedShelf.items || [],
        icon,
      };
    }

    return null;
  }, [sectionId, shelves, history]);

  const tracks = sectionData?.items || [];
  const isLoading = sectionId === 'history' ? isHistoryLoading : isShelvesLoading;

  const totalSeconds = useMemo(() => {
    return tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
  }, [tracks]);

  const handlePlayAll = () => {
    if (tracks.length === 0) return;
    setQueue(tracks, 0, { type: 'custom', name: sectionData?.title || 'Section' });
  };

  const handleShufflePlay = () => {
    if (tracks.length === 0) return;
    const shuffled = smartShuffleTracks(tracks);
    setQueue(shuffled, 0, { type: 'custom', name: sectionData?.title || 'Section' });
  };

  const handleTrackRowClick = (track: Track, idx: number) => {
    const isCurrent = getTrackId(currentTrack) === getTrackId(track);
    if (isCurrent) {
      setIsPlaying(!isPlaying);
    } else {
      setQueue(tracks, idx, { type: 'custom', name: sectionData?.title || 'Section' });
    }
  };

  return (
    <div className="p-6 sm:p-10 pb-36 max-w-[1600px] mx-auto space-y-8 select-none">
      {/* ── Top Navigation Bar ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full liquid-glass text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 transition-all duration-200 active:scale-95 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        {/* View Mode Switcher Toggle */}
        <div className="flex items-center gap-1 bg-white/[0.06] border border-white/10 rounded-full p-1 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
              viewMode === 'cards'
                ? 'bg-purple-600/80 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Show as Cards Grid (Premium)"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cards</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('bars')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
              viewMode === 'bars'
                ? 'bg-purple-600/80 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Show as Horizontal Bars"
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Horizontal Bars</span>
          </button>
        </div>
      </div>

      {/* ── Section Hero Header ────────────────────────────────────────── */}
      <div className="relative p-6 sm:p-8 rounded-3xl liquid-glass-expanded border border-white/12 overflow-hidden shadow-2xl">
        {/* Subtle ambient gradient flare */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/15 rounded-full blur-[90px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl liquid-glass border border-white/15">
                {sectionData?.icon || <Sparkles className="w-5 h-5 text-purple-400" />}
              </div>
              <span className="text-xs uppercase font-bold tracking-widest text-purple-300">
                Curated Section
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
              {sectionData?.title || 'Explore Collection'}
            </h1>

            <p className="text-sm sm:text-base text-zinc-300/90 max-w-2xl font-medium">
              {sectionData?.description}
            </p>

            <div className="flex items-center gap-2 text-xs text-zinc-400 pt-1">
              <span>{tracks.length} tracks</span>
              {totalSeconds > 0 && (
                <>
                  <span>•</span>
                  <span>{formatTotalTime(totalSeconds)}</span>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePlayAll}
              disabled={tracks.length === 0}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold text-sm shadow-[0_0_25px_rgba(168,85,247,0.4)] transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Play All</span>
            </button>

            <button
              type="button"
              onClick={handleShufflePlay}
              disabled={tracks.length === 0}
              className="flex items-center gap-2 px-5 py-3 rounded-full liquid-glass text-white font-semibold text-sm hover:bg-white/15 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
              title="Shuffle all tracks in this section"
            >
              <Shuffle className="w-4 h-4 text-purple-300" />
              <span>Shuffle</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Content View (Cards Grid or Horizontal Bars) ─────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <div key={i} className="aspect-square bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : tracks.length === 0 ? (
        <div className="p-16 rounded-3xl liquid-glass border border-white/10 text-center space-y-3">
          <Music2 className="w-12 h-12 text-zinc-500 mx-auto" />
          <h3 className="text-lg font-bold text-white">No tracks found in this section</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Listen to more music from the home page or search for artists to enrich this collection.
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        /* ── Cards Grid View (Default: Ultra-Premium Liquid Glass Showcase) ── */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {tracks.map((track, idx) => (
            <div key={`${track.providerTrackId}-${idx}`} className="w-full">
              <TrackCard
                track={track}
                contextQueue={tracks}
                trackIndex={idx}
                queueSource={{ type: 'custom', name: sectionData?.title || 'Section' }}
              />
            </div>
          ))}
        </div>
      ) : (
        /* ── Horizontal Bars View (Clean Tracklist Bars) ─────────────── */
        <div className="space-y-1.5">
          {/* Header Row */}
          <div className="grid grid-cols-[36px_1fr_90px_40px] items-center px-4 py-2 text-xs font-semibold text-zinc-400 border-b border-white/5 uppercase tracking-wider">
            <span>#</span>
            <span>Title</span>
            <span className="text-right flex items-center justify-end gap-1">
              <Clock className="w-3.5 h-3.5" />
            </span>
            <span />
          </div>

          {/* Song Rows */}
          {tracks.map((track, idx) => {
            const isCurrent = getTrackId(currentTrack) === getTrackId(track);
            const isCurrentPlaying = isCurrent && isPlaying;

            return (
              <div
                key={`${track.providerTrackId}-${idx}`}
                onClick={() => handleTrackRowClick(track, idx)}
                className={`group grid grid-cols-[36px_1fr_90px_40px] items-center px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer border ${
                  isCurrent
                    ? 'bg-purple-950/40 border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                    : 'bg-white/[0.02] hover:bg-white/[0.07] border-white/5 hover:border-white/10'
                }`}
              >
                {/* Index or Equalizer indicator */}
                <div className="flex items-center text-xs font-semibold">
                  {isCurrent ? (
                    <EqualizerBars isPlaying={isCurrentPlaying} size="xs" />
                  ) : (
                    <>
                      <span className="group-hover:hidden text-zinc-400">{idx + 1}</span>
                      <Play className="w-3.5 h-3.5 hidden group-hover:block text-white fill-current" />
                    </>
                  )}
                </div>

                {/* Cover Art + Title + Artist */}
                <div className="flex items-center gap-3.5 min-w-0 pr-4">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-purple-950/40 flex-shrink-0 border border-white/10">
                    {track.albumArt ? (
                      <img
                        src={track.albumArt}
                        alt={track.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music2 className="w-4 h-4 text-purple-300/40" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-semibold truncate ${
                        isCurrent ? 'text-purple-300' : 'text-white group-hover:text-purple-200'
                      }`}
                      title={track.title}
                    >
                      {track.title}
                    </p>
                    <p className="text-xs text-zinc-400 truncate mt-0.5" title={track.artist}>
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

                {/* Duration */}
                <div className="text-xs text-zinc-400 text-right font-mono">
                  {formatDuration(track.duration || 0)}
                </div>

                {/* 3-Dots Menu */}
                <div
                  className="flex justify-end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <TrackMenu track={track} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
