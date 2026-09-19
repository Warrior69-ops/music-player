'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Play, Sparkles, Radio, Flame, History, Compass, ArrowRight, Headphones } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useHistory, useHomeShelves, RecommendationShelf } from '@/hooks/queries';
import { usePlayerStore, Track } from '@/store/usePlayerStore';
import { TrackCard } from '@/components/ui/TrackCard';
import api from '@/lib/api';

export default function HomePage() {
  const { user } = useAuthStore();
  const { setQueue } = usePlayerStore();
  const { data: history, isLoading: isHistoryLoading } = useHistory();
  const { data: shelves, isLoading: isShelvesLoading, isError: isShelvesError } = useHomeShelves(
    !!user?.hasCompletedOnboarding
  );

  // Predictive prefetching: prefetch top YouTube tracks from first recommendation shelf or history
  useEffect(() => {
    if (shelves && shelves.length > 0 && shelves[0].items?.length > 0) {
      const topTracks = shelves[0].items
        .filter((t) => t.provider === 'youtube')
        .slice(0, 2);
      topTracks.forEach((track) => {
        api.get(`/music/proxy/youtube/${track.providerTrackId}/prefetch`).catch(() => {});
      });
    } else if (history && history.length > 0) {
      const topYoutube = history.filter((t) => t.provider === 'youtube').slice(0, 2);
      topYoutube.forEach((track) => {
        api.get(`/music/proxy/youtube/${track.providerTrackId}/prefetch`).catch(() => {});
      });
    }
  }, [shelves, history]);

  const handlePlayAll = (tracks: Track[]) => {
    if (!tracks || tracks.length === 0) return;
    setQueue(tracks, 0);
  };

  const getShelfIcon = (shelf: RecommendationShelf, index: number) => {
    if (shelf.id === 'shelf-recent-vibe') return <Headphones className="w-5 h-5 text-emerald-400" />;
    if (shelf.id === 'shelf-1' || index === 0) return <Sparkles className="w-5 h-5 text-primary" />;
    if (shelf.id === 'shelf-2') return <Radio className="w-5 h-5 text-cyan-400" />;
    return <Flame className="w-5 h-5 text-amber-400" />;
  };

  if (!user) return null;

  return (
    <div className="p-6 sm:p-10 pb-36 max-w-[1600px] mx-auto space-y-12 select-none">
      {/* ── Welcome Header ────────────────────────────────────────────── */}
      <div className="border-b border-white/5 pb-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Welcome back, {user.name || user.username || 'Friend'}
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Personalized discovery feed based on your artists and languages.
        </p>
      </div>

      {/* ── If Onboarding Not Completed ──────────────────────────────── */}
      {!user.hasCompletedOnboarding && (
        <div className="p-8 rounded-3xl bg-gradient-to-r from-primary/20 via-purple-900/20 to-black border border-primary/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-[0_10px_40px_rgba(168,85,247,0.15)]">
          <div>
            <div className="flex items-center gap-2 text-primary font-semibold text-xs uppercase tracking-wider mb-2">
              <Compass className="w-4 h-4" />
              <span>Cold-Start Setup</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-1">
              Tune your recommendation algorithm
            </h3>
            <p className="text-sm text-zinc-300 max-w-xl">
              Choose your languages and at least 5 favorite artists so we can generate your Daily Mix and trending radio shelves.
            </p>
          </div>

          <Link
            href="/onboarding"
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-black font-bold text-sm hover:bg-accent transition-all shadow-lg hover:scale-105 active:scale-95 flex-shrink-0"
          >
            <span>Start Onboarding</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* ── Loading Skeleton for Shelves ─────────────────────────────── */}
      {isShelvesLoading && (
        <div className="space-y-10">
          {[1, 2, 3].map((s) => (
            <div key={s} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-48 h-6 bg-white/10 rounded-lg animate-pulse" />
                <div className="w-20 h-7 bg-white/10 rounded-full animate-pulse" />
              </div>
              <div className="flex gap-4 overflow-hidden">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-48 h-64 bg-white/5 rounded-2xl animate-pulse flex-shrink-0" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Algorithmic Horizontal Shelves ───────────────────────────── */}
      {shelves && shelves.length > 0 && (
        <div className="space-y-12">
          {shelves.map((shelf: RecommendationShelf, idx: number) => (
            <section key={shelf.id || idx} className="space-y-4">
              {/* Shelf Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {getShelfIcon(shelf, idx)}
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    {shelf.title}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => handlePlayAll(shelf.items)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95"
                  title="Play all tracks from this shelf"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play All</span>
                </button>
              </div>

              {/* Horizontal Scrolling Rail */}
              <div className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-4 pt-1 scrollbar-thin scrollbar-thumb-white/15 scrollbar-track-transparent">
                {shelf.items.map((track, trackIdx) => (
                  <div
                    key={`${track.providerTrackId}-${trackIdx}`}
                    className="w-[180px] sm:w-[210px] flex-shrink-0 snap-start"
                  >
                    <TrackCard track={track} contextQueue={shelf.items} trackIndex={trackIdx} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* ── Section: Recently Played (History) ────────────────────────── */}
      <section className="space-y-4 pt-6 border-t border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Recently Played
            </h2>
          </div>

          {history && history.length > 0 && (
            <Link
              href="/history"
              className="text-xs font-semibold text-muted-foreground hover:text-white transition-colors"
            >
              See all
            </Link>
          )}
        </div>

        {isHistoryLoading ? (
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-48 h-64 bg-white/5 rounded-2xl animate-pulse flex-shrink-0" />
            ))}
          </div>
        ) : history?.length ? (
          <div className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-4 pt-1 scrollbar-thin scrollbar-thumb-white/15 scrollbar-track-transparent">
            {history.slice(0, 15).map((track, idx) => (
              <div
                key={`history-${track.providerTrackId}-${idx}`}
                className="w-[180px] sm:w-[210px] flex-shrink-0 snap-start"
              >
                <TrackCard track={track} contextQueue={history.slice(0, 15)} trackIndex={idx} />
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/5 text-center text-xs text-muted-foreground">
            No recently played tracks yet. Listen to any shelf above to build your history!
          </div>
        )}
      </section>
    </div>
  );
}
