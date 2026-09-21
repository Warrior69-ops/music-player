'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Play,
  Clock,
  Music2,
  Trophy,
  Flame,
  BarChart3,
  Disc,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { useListeningStats } from '@/hooks/queries';
import { usePlayerStore, getTrackId, Track } from '@/store/usePlayerStore';
import { useAuthStore } from '@/store/useAuthStore';
import { WrappedModal } from '@/components/stats/WrappedModal';

function formatDuration(seconds?: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function StatsPage() {
  const { data: stats, isLoading } = useListeningStats();
  const { user } = useAuthStore();
  const { setCurrentTrack } = usePlayerStore();
  const [isWrappedOpen, setIsWrappedOpen] = useState(false);

  const userName = user?.name || user?.username || 'You';

  return (
    <div className="min-h-full pb-28 px-4 md:px-8 pt-6 max-w-7xl mx-auto space-y-8 select-none">
      {/* ── Hero Banner: Launch MELØ Wrapped ───────────────────────── */}
      <div
        className="relative overflow-hidden rounded-3xl p-6 sm:p-10 border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
        style={{
          background: 'linear-gradient(135deg, rgba(88,28,135,0.45) 0%, rgba(30,11,54,0.6) 50%, rgba(6,182,212,0.2) 100%)',
          WebkitBackdropFilter: 'blur(28px) saturate(135%)',
          backdropFilter: 'blur(28px) saturate(135%)',
        }}
      >
        {/* Ambient background glows */}
        <div className="absolute -top-12 -right-12 w-96 h-96 rounded-full bg-primary/30 blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-96 h-96 rounded-full bg-cyan-500/20 blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="max-w-xl space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-purple-200 text-xs font-bold tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Personal Sonic Archive</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {userName}&apos;s Listening Stats & Wrapped
            </h1>

            <p className="text-sm sm:text-base text-zinc-300">
              Relive your music milestones, discover your sonic personality, and export your personal Wrapped story card.
            </p>
          </div>

          <button
            onClick={() => setIsWrappedOpen(true)}
            className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-white text-black font-black text-sm hover:bg-purple-100 hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.35)] shrink-0"
          >
            <Sparkles className="w-4 h-4 text-purple-600 fill-purple-600" />
            <span>Launch Wrapped Experience</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Metric KPI Cards Grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* KPI 1: Total Minutes */}
        <div
          className="p-5 rounded-3xl liquid-glass-card border border-white/10 flex flex-col justify-between h-36"
          style={{
            WebkitBackdropFilter: 'blur(20px) saturate(135%)',
            backdropFilter: 'blur(20px) saturate(135%)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Time Streamed
            </span>
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-300">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              {isLoading ? '...' : (stats?.totalMinutes || 0).toLocaleString()}
              <span className="text-xs text-zinc-400 font-sans font-normal ml-1.5">mins</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              ~{stats?.totalHours || 0} hours of music
            </p>
          </div>
        </div>

        {/* KPI 2: Total Plays */}
        <div
          className="p-5 rounded-3xl liquid-glass-card border border-white/10 flex flex-col justify-between h-36"
          style={{
            WebkitBackdropFilter: 'blur(20px) saturate(135%)',
            backdropFilter: 'blur(20px) saturate(135%)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Songs Streamed
            </span>
            <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-300">
              <Music2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              {isLoading ? '...' : (stats?.totalPlays || 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              across {stats?.totalTracks || 0} unique tracks
            </p>
          </div>
        </div>

        {/* KPI 3: Top Artist */}
        <div
          className="p-5 rounded-3xl liquid-glass-card border border-white/10 flex flex-col justify-between h-36"
          style={{
            WebkitBackdropFilter: 'blur(20px) saturate(135%)',
            backdropFilter: 'blur(20px) saturate(135%)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Top Artist
            </span>
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-300">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-lg sm:text-xl font-black text-white truncate">
              {isLoading ? '...' : stats?.topArtists?.[0]?.name || 'No artist yet'}
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
              {stats?.topArtists?.[0]?.plays || 0} streams logged
            </p>
          </div>
        </div>

        {/* KPI 4: Sonic Persona */}
        <div
          className="p-5 rounded-3xl liquid-glass-card border border-white/10 flex flex-col justify-between h-36"
          style={{
            WebkitBackdropFilter: 'blur(20px) saturate(135%)',
            backdropFilter: 'blur(20px) saturate(135%)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Sound Persona
            </span>
            <div className="p-2 rounded-xl bg-fuchsia-500/15 text-fuchsia-300">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="text-base sm:text-lg font-black text-purple-300 truncate">
              {isLoading ? '...' : stats?.persona?.title || 'MELØ Explorer'}
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
              Signature audio vibe
            </p>
          </div>
        </div>
      </div>

      {/* ── Top Tracks Leaderboard ─────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-white">Top Tracks of All Time</h2>
          </div>
          <span className="text-xs text-zinc-400">Sorted by minutes streamed</span>
        </div>

        {stats?.topTracks && stats.topTracks.length > 0 ? (
          <div
            className="rounded-3xl liquid-glass-card border border-white/10 overflow-hidden divide-y divide-white/5"
            style={{
              WebkitBackdropFilter: 'blur(20px) saturate(135%)',
              backdropFilter: 'blur(20px) saturate(135%)',
            }}
          >
            {stats.topTracks.map((track, idx) => {
              const plays = track.playCount || 1;
              const minutesStreamed = track.minutesStreamed ?? Math.max(1, Math.round(((track.duration || 180) * plays) / 60));
              const isTop3 = idx < 3;

              return (
                <div
                  key={`${getTrackId(track)}-${idx}`}
                  className="group flex items-center justify-between p-3.5 sm:p-4 hover:bg-white/[0.06] transition-colors cursor-pointer"
                  onClick={() => setCurrentTrack(track)}
                >
                  {/* Left: Rank, Art, Titles */}
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    {/* Rank Badge */}
                    <div className="w-7 text-center font-black text-sm">
                      {idx === 0 ? (
                        <span className="text-amber-400 text-base">🥇</span>
                      ) : idx === 1 ? (
                        <span className="text-zinc-300 text-base">🥈</span>
                      ) : idx === 2 ? (
                        <span className="text-amber-600 text-base">🥉</span>
                      ) : (
                        <span className="text-zinc-500 group-hover:hidden">{idx + 1}</span>
                      )}
                      <div className="hidden group-hover:flex items-center justify-center text-white">
                        <Play className="w-4 h-4 fill-white" />
                      </div>
                    </div>

                    {/* Album Art */}
                    {track.albumArt ? (
                      <img
                        src={track.albumArt}
                        alt={track.title}
                        className="w-11 h-11 rounded-xl object-cover shadow flex-shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                        <Music2 className="w-5 h-5 text-white/30" />
                      </div>
                    )}

                    {/* Titles */}
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">
                        {track.title}
                      </h4>
                      <p className="text-xs text-zinc-400 truncate mt-0.5">{track.artist}</p>
                    </div>
                  </div>

                  {/* Right: Minutes Streamed & Plays */}
                  <div className="flex items-center gap-4 ml-4">
                    <div className="text-right">
                      <div className="text-xs font-bold text-white font-mono">
                        {minutesStreamed.toLocaleString()} <span className="text-[11px] font-sans text-purple-300 font-normal">mins</span>
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {plays} {plays === 1 ? 'play' : 'plays'}
                      </div>
                    </div>
                    <span className="text-xs font-mono text-zinc-500 hidden sm:inline-block">
                      {formatDuration(track.duration)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 rounded-3xl liquid-glass-card border border-white/10 text-center">
            <Music2 className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-white">No tracks in your history yet</p>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              Play songs from Home or Search, and your personalized stats will appear here automatically!
            </p>
          </div>
        )}
      </div>

      {/* ── Top Artists Showcase ───────────────────────────────────────── */}
      {stats?.topArtists && stats.topArtists.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Disc className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">Most Streamed Artists</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {stats.topArtists.map((artist, idx) => (
              <div
                key={artist.name}
                className="p-5 rounded-3xl liquid-glass-card border border-white/10 flex flex-col items-center text-center space-y-3 hover:scale-105 transition-all group"
                style={{
                  WebkitBackdropFilter: 'blur(20px) saturate(135%)',
                  backdropFilter: 'blur(20px) saturate(135%)',
                }}
              >
                <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-white/20 shadow-lg group-hover:border-primary transition-colors">
                  {artist.thumbnail ? (
                    <img
                      src={artist.thumbnail}
                      alt={artist.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-violet-900 to-zinc-900 flex items-center justify-center">
                      <Disc className="w-8 h-8 text-white/40" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 w-full">
                  <h4 className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">
                    {artist.name}
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {artist.plays} {artist.plays === 1 ? 'stream' : 'streams'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MELØ Wrapped Story Modal */}
      <WrappedModal
        isOpen={isWrappedOpen}
        onClose={() => setIsWrappedOpen(false)}
        stats={stats}
        userName={userName}
      />
    </div>
  );
}
