'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Play,
  Pause,
  Shuffle,
  Infinity as InfinityIcon,
  Heart,
  Plus,
  Radio,
  Mic2,
  Sparkles,
  CornerDownRight,
  X,
  Music2,
  Disc3,
  Share2,
  Check,
  ListMusic,
  ListPlus,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { usePlayerStore, getTrackId, Track } from '@/store/usePlayerStore';
import { useUIStore } from '@/store/useUIStore';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useFavorites, useAddFavorite, useRemoveFavorite, useLyrics } from '@/hooks/queries';
import { EqualizerBars } from '@/components/ui/EqualizerBars';
import { LyricsView } from '@/components/ui/LyricsView';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

function formatDuration(seconds?: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function NowPlayingPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'upnext' | 'lyrics' | 'related'>('upnext');
  const [copied, setCopied] = useState(false);

  const {
    currentTrack,
    queue,
    currentIndex,
    isPlaying,
    isShuffle,
    isAutoplayEnabled,
    queueSource,
    toggleShuffle,
    toggleAutoplay,
    jumpToIndex,
    removeFromQueue,
    clearQueue,
    playNext,
  } = usePlayerStore();

  const { openPlaylistModal } = useUIStore();
  const { currentTime, duration, togglePlay, seek } = useAudioPlayer();
  const { data: favorites } = useFavorites();
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();

  // Lyrics query
  const { data: lyricsData, isLoading: isLyricsLoading } = useLyrics(
    currentTrack?.title,
    currentTrack?.artist,
    currentTrack?.duration
  );

  const isFavorite = Boolean(
    currentTrack &&
      favorites?.some(
        (f) =>
          f.providerTrackId ===
          (currentTrack.providerTrackId || currentTrack.id)
      )
  );

  const handleFavoriteToggle = () => {
    if (!currentTrack) return;
    const trackId = currentTrack.providerTrackId || currentTrack.id || '';
    if (isFavorite) {
      removeFavorite.mutate(trackId, {
        onSuccess: () => toast.success('Removed from favorites'),
      });
    } else {
      addFavorite.mutate(currentTrack, {
        onSuccess: () => toast.success('Added to favorites'),
      });
    }
  };

  const handleShare = () => {
    if (!currentTrack) return;
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success('Now playing link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Segregate upcoming queue into User Queue (Up Next) and Autoplay
  const upcomingWithIndex = useMemo(() => {
    return queue
      .map((track, idx) => ({ track, actualIndex: idx }))
      .slice(currentIndex + 1);
  }, [queue, currentIndex]);

  const userQueueItems = useMemo(
    () => upcomingWithIndex.filter(({ track }) => !track.isAutoplay),
    [upcomingWithIndex]
  );

  const autoplayItems = useMemo(
    () => upcomingWithIndex.filter(({ track }) => !!track.isAutoplay),
    [upcomingWithIndex]
  );

  // Derive human-readable Playing from title
  const playingFromTitle = useMemo(() => {
    if (queueSource?.name) return queueSource.name;
    if (currentTrack?.album) return currentTrack.album;
    if (currentTrack?.artist) return `${currentTrack.artist} Radio`;
    return 'Nocturne Music';
  }, [queueSource, currentTrack]);

  // If no track is loaded, show welcoming fallback
  if (!currentTrack) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 text-center select-none">
        <div className="w-24 h-24 rounded-full bg-purple-950/40 border border-purple-500/20 flex items-center justify-center mb-6 shadow-2xl">
          <Disc3 className="w-12 h-12 text-purple-400 animate-spin-slow" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Nothing is playing right now</h2>
        <p className="text-sm text-zinc-400 max-w-md mb-6">
          Pick a song, album, or playlist from your home feed or library to immerse in the full Now Playing experience.
        </p>
        <Link
          href="/"
          className="px-6 py-2.5 rounded-full bg-primary text-black font-semibold text-sm hover:scale-105 active:scale-95 transition-all shadow-lg"
        >
          Explore Music
        </Link>
      </div>
    );
  }

  return (
    <div className="relative isolate h-[calc(100vh-8.5rem)] flex flex-col lg:flex-row gap-6 lg:gap-10 p-4 md:p-8 lg:p-10 overflow-hidden select-none">
      {/* ── Immersive Ambient Blurred Album Art Canvas (Shines vibrantly through Liquid Glass) ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none">
        {currentTrack.albumArt && (
          <div
            className="absolute -inset-28 bg-cover bg-center filter blur-[80px] opacity-70 scale-135 transition-all duration-1000 transform-gpu will-change-transform"
            style={{ backgroundImage: `url(${currentTrack.albumArt})` }}
          />
        )}
        {/* Vibrant fluid gradient aura orbs for optical saturation */}
        <div className="absolute top-0 -left-10 w-[550px] h-[550px] rounded-full bg-purple-600/40 blur-[110px] animate-pulse" />
        <div className="absolute bottom-0 right-10 w-[600px] h-[600px] rounded-full bg-violet-600/35 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-fuchsia-600/25 blur-[130px]" />
        <div className="absolute inset-0 bg-black/25" />
      </div>

      {/* ── Left Pane: Grand Artwork & Track Metadata ───────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center min-w-0 py-2 relative z-10">
        {/* Ambient Glow Backdrop */}
        <div className="absolute w-[360px] md:w-[480px] aspect-square rounded-full bg-purple-600/30 blur-[100px] pointer-events-none" />

        {/* Hero Artwork with subtle vinyl reflection */}
        <div className="relative w-full max-w-[340px] sm:max-w-[400px] md:max-w-[430px] aspect-square rounded-3xl overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.85)] border border-white/20 group">
          {currentTrack.albumArt ? (
            <img
              src={currentTrack.albumArt}
              alt={currentTrack.title}
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-950 to-zinc-900">
              <Music2 className="w-20 h-20 text-white/20" />
            </div>
          )}

          {/* Ambient Inner Glass Rim */}
          <div className="absolute inset-0 ring-1 ring-inset ring-white/10 pointer-events-none rounded-3xl" />
        </div>

        {/* Track Title, Artist, & Album */}
        <div className="w-full max-w-[430px] flex flex-col items-center text-center mt-6">
          <div className="flex items-center gap-2 max-w-full">
            <h1
              className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate hover:text-purple-200 transition-colors"
              title={currentTrack.title}
            >
              {currentTrack.title}
            </h1>
            {currentTrack.explicit && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-white/20 text-white/90">
                E
              </span>
            )}
          </div>

          <div className="text-sm md:text-base text-zinc-400 mt-1 truncate max-w-full">
            {currentTrack.artist ? (
              <Link
                href={`/artist/${encodeURIComponent((currentTrack as any).artistId || currentTrack.artist)}`}
                className="hover:text-purple-300 hover:underline transition-colors"
              >
                {currentTrack.artist}
              </Link>
            ) : (
              'Unknown Artist'
            )}
            {currentTrack.album && (
              <span className="text-zinc-500">
                {' '}
                •{' '}
                {currentTrack.albumId ? (
                  <Link
                    href={`/album/${encodeURIComponent(currentTrack.albumId)}`}
                    className="hover:text-white transition-colors"
                  >
                    {currentTrack.album}
                  </Link>
                ) : (
                  currentTrack.album
                )}
              </span>
            )}
          </div>

          {/* Quick Action Pills Row with Liquid Glass finish */}
          <div className="flex items-center gap-3 mt-4">
            {/* Favorite */}
            <button
              onClick={handleFavoriteToggle}
              className={`p-2.5 rounded-full border transition-all duration-200 hover:scale-110 active:scale-95 ${
                isFavorite
                  ? 'bg-primary/25 border-primary/50 text-primary shadow-[0_0_15px_rgba(168,85,247,0.35)]'
                  : 'liquid-glass-pill text-zinc-400 hover:text-white'
              }`}
              title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-primary' : ''}`} />
            </button>

            {/* Add to Playlist */}
            <button
              onClick={() => openPlaylistModal(currentTrack)}
              className="p-2.5 rounded-full liquid-glass-pill text-zinc-400 hover:text-white hover:scale-110 active:scale-95 transition-all"
              title="Add to Playlist"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="p-2.5 rounded-full liquid-glass-pill text-zinc-400 hover:text-white hover:scale-110 active:scale-95 transition-all"
              title="Copy link"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>

            {/* Shuffle */}
            <button
              onClick={toggleShuffle}
              className={`p-2.5 rounded-full border transition-all duration-200 hover:scale-110 active:scale-95 ${
                isShuffle
                  ? 'bg-primary/25 border-primary/50 text-primary shadow-[0_0_15px_rgba(168,85,247,0.35)]'
                  : 'liquid-glass-pill text-zinc-400 hover:text-white'
              }`}
              title={isShuffle ? 'Shuffle is ON' : 'Shuffle is OFF'}
            >
              <Shuffle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Right Pane: Tabs & Up Next / Autoplay Queue in Liquid Glass ──── */}
      <div
        className="w-full lg:w-[480px] xl:w-[540px] flex flex-col h-full liquid-glass-card rounded-3xl border border-white/15 overflow-hidden shadow-2xl relative z-10 transform-gpu will-change-transform"
        style={{
          WebkitBackdropFilter: 'blur(28px) saturate(135%)',
          backdropFilter: 'blur(28px) saturate(135%)',
        }}
      >
        {/* Navigation Tabs (UP NEXT | LYRICS | RELATED) with Liquid Sliding Pill */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-white/[0.04] border border-white/10">
            {(['upnext', 'lyrics', 'related'] as const).map((tab) => {
              const label = tab === 'upnext' ? 'Up Next' : tab === 'lyrics' ? 'Lyrics' : 'Related';
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors z-10 ${
                    isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nowPlayingTabPill"
                      className="absolute inset-0 rounded-full bg-primary/25 border border-primary/40 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                      transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.5 }}
                    />
                  )}
                  <span className="relative z-20">{label}</span>
                </button>
              );
            })}
          </div>

          {/* Autoplay status indicator pill */}
          <button
            onClick={toggleAutoplay}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
              isAutoplayEnabled
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                : 'liquid-glass-pill text-zinc-400 hover:text-white'
            }`}
            title={isAutoplayEnabled ? 'Infinite Autoplay is active' : 'Autoplay is paused'}
          >
            <InfinityIcon className="w-3.5 h-3.5" />
            <span>{isAutoplayEnabled ? 'Autoplay On' : 'Autoplay Off'}</span>
          </button>
        </div>

        {/* ── TAB 1: UP NEXT & AUTOPLAY ─────────────────────────────────── */}
        {activeTab === 'upnext' && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
            {/* Header: Playing From Context */}
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block">
                  Playing from
                </span>
                <h3 className="text-sm font-bold text-purple-200 truncate mt-0.5">
                  {playingFromTitle}
                </h3>
              </div>

              {queue.length > 1 && (
                <button
                  onClick={clearQueue}
                  className="text-xs text-zinc-400 hover:text-rose-400 transition-colors px-2 py-1 rounded-lg hover:bg-rose-500/10"
                  title="Clear remaining upcoming tracks"
                >
                  Clear
                </button>
              )}
            </div>

            {/* 1. Currently Playing Highlight Card */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Now Playing
              </div>
              <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-purple-950/30 border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.15)] relative overflow-hidden group">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />

                {currentTrack.albumArt ? (
                  <img
                    src={currentTrack.albumArt}
                    alt={currentTrack.title}
                    className="w-12 h-12 rounded-xl object-cover shadow flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Music2 className="w-5 h-5 text-white/40" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">
                    {currentTrack.title}
                  </h4>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">{currentTrack.artist}</p>
                </div>

                <div className="flex items-center gap-2 pr-1">
                  <EqualizerBars isPlaying={isPlaying} size="sm" />
                </div>
              </div>
            </div>

            {/* 2. Up Next Section (Album / Playlist / Favorites / User Queue) */}
            {userQueueItems.length > 0 ? (
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2.5">
                  <span>Up Next ({userQueueItems.length})</span>
                  {isShuffle && <span className="text-primary font-semibold text-[10px]">Shuffled</span>}
                </div>

                <div className="space-y-1.5">
                  {userQueueItems.map(({ track, actualIndex }, relIdx) => (
                    <div
                      key={`${getTrackId(track)}-${actualIndex}`}
                      className="group flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.06] transition-colors border border-transparent hover:border-white/5 cursor-pointer"
                      onClick={() => jumpToIndex(actualIndex)}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-5 text-center text-xs text-zinc-500 group-hover:hidden font-mono">
                          {relIdx + 1}
                        </div>
                        <div className="w-5 text-center hidden group-hover:flex items-center justify-center text-white">
                          <Play className="w-3.5 h-3.5 fill-white" />
                        </div>

                        {track.albumArt ? (
                          <img
                            src={track.albumArt}
                            alt={track.title}
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                            <Music2 className="w-4 h-4 text-white/30" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <h5 className="text-xs font-semibold text-white truncate group-hover:text-primary transition-colors">
                            {track.title}
                          </h5>
                          <p className="text-[11px] text-zinc-400 truncate">{track.artist}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 ml-2">
                        <span className="text-xs text-zinc-500 group-hover:hidden font-mono">
                          {formatDuration(track.duration)}
                        </span>

                        <div className="hidden group-hover:flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              playNext(track);
                            }}
                            className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                            title="Play Immediately Next"
                          >
                            <CornerDownRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromQueue(actualIndex);
                            }}
                            className="p-1.5 rounded-md hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 transition-colors"
                            title="Remove from Queue"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                <p className="text-xs text-zinc-400">
                  You&apos;ve reached the end of {playingFromTitle}.
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Autoplay recommendations will seamlessly continue below.
                </p>
              </div>
            )}

            {/* 3. Autoplay Section (Infinite Recommendations) */}
            {autoplayItems.length > 0 && (
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-cyan-400 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Autoplay ({autoplayItems.length})</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 lowercase font-normal">
                    similar to current song
                  </span>
                </div>

                <div className="space-y-1.5">
                  {autoplayItems.map(({ track, actualIndex }) => (
                    <div
                      key={`${getTrackId(track)}-${actualIndex}`}
                      className="group flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.06] transition-colors border border-transparent hover:border-cyan-500/10 cursor-pointer"
                      onClick={() => jumpToIndex(actualIndex)}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-5 text-center flex items-center justify-center text-zinc-500 group-hover:text-white">
                          <Play className="w-3.5 h-3.5 group-hover:fill-current opacity-70 group-hover:opacity-100" />
                        </div>

                        {track.albumArt ? (
                          <img
                            src={track.albumArt}
                            alt={track.title}
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                            <Music2 className="w-4 h-4 text-white/30" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <h5 className="text-xs font-semibold text-white truncate group-hover:text-cyan-300 transition-colors">
                            {track.title}
                          </h5>
                          <p className="text-[11px] text-zinc-400 truncate">{track.artist}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 ml-2">
                        <span className="text-xs text-zinc-500 group-hover:hidden font-mono">
                          {formatDuration(track.duration)}
                        </span>

                        <div className="hidden group-hover:flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              playNext(track);
                            }}
                            className="p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                            title="Play Immediately Next"
                          >
                            <CornerDownRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: LYRICS ─────────────────────────────────────────────── */}
        {activeTab === 'lyrics' && (
          <div className="flex-1 overflow-hidden p-4 relative">
            {isLyricsLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-16 text-zinc-400">
                <Mic2 className="w-8 h-8 text-primary animate-pulse" />
                <p className="text-xs">Fetching synchronized lyrics...</p>
              </div>
            ) : lyricsData?.lyrics && lyricsData.lyrics.length > 0 ? (
              <LyricsView
                lyricsData={lyricsData}
                currentTime={currentTime}
                isPlaying={isPlaying}
                onSeek={seek}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2 py-16 text-center">
                <Mic2 className="w-8 h-8 text-zinc-600 mb-1" />
                <p className="text-sm font-semibold text-zinc-300">No lyrics available for this track</p>
                <p className="text-xs text-zinc-500 max-w-xs">
                  We couldn&apos;t find matching synchronized lyrics for &quot;{currentTrack.title}&quot;.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: RELATED & ARTIST INFO ──────────────────────────────── */}
        {activeTab === 'related' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
            {/* Artist Card Banner */}
            <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                  Artist Profile
                </span>
                <h4 className="text-base font-bold text-white truncate mt-0.5">
                  {currentTrack.artist}
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Discover more releases and top tracks from this artist.
                </p>
              </div>

              <Link
                href={`/artist/${encodeURIComponent((currentTrack as any).artistId || currentTrack.artist)}`}
                className="px-4 py-2 rounded-full bg-primary/20 text-primary border border-primary/40 hover:bg-primary hover:text-black transition-all text-xs font-semibold shrink-0 ml-3"
              >
                View Artist
              </Link>
            </div>

            {/* Album Card Banner (If Available) */}
            {currentTrack.album && (
              <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                    Album Release
                  </span>
                  <h4 className="text-base font-bold text-white truncate mt-0.5">
                    {currentTrack.album}
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Listen to the full album experience.
                  </p>
                </div>

                {currentTrack.albumId ? (
                  <Link
                    href={`/album/${encodeURIComponent(currentTrack.albumId)}`}
                    className="px-4 py-2 rounded-full bg-white/10 text-white border border-white/10 hover:bg-white hover:text-black transition-all text-xs font-semibold shrink-0 ml-3"
                  >
                    View Album
                  </Link>
                ) : (
                  <span className="text-xs text-zinc-500 px-3 py-1">Album Track</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
