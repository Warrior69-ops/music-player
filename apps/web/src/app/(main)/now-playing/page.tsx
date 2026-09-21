'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
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
  Volume2,
  VolumeX,
  Waves,
  Sliders,
  Moon,
  ChevronDown,
} from 'lucide-react';
import { usePlayerStore, getTrackId } from '@/store/usePlayerStore';
import { useUIStore } from '@/store/useUIStore';
import { useEqualizerStore } from '@/store/useEqualizerStore';
import { useSleepTimerStore } from '@/store/useSleepTimerStore';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useFavorites, useAddFavorite, useRemoveFavorite, useLyrics } from '@/hooks/queries';
import { AudioVisualizerCanvas, addAlpha } from '@/components/visualizer/AudioVisualizerCanvas';
import { useCoverColors } from '@/hooks/useCoverColors';
import { EqualizerBars } from '@/components/ui/EqualizerBars';
import { LyricsView } from '@/components/ui/LyricsView';
import { NowPlayingProgressBar } from '@/components/ui/NowPlayingProgressBar';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [isHoveringSeek, setIsHoveringSeek] = useState(false);
  const [hoverSeekPercent, setHoverSeekPercent] = useState<number | null>(null);

  const {
    currentTrack,
    queue,
    currentIndex,
    isPlaying,
    isShuffle,
    isAutoplayEnabled,
    queueSource,
    volume,
    setVolume,
    toggleShuffle,
    toggleAutoplay,
    jumpToIndex,
    removeFromQueue,
    clearQueue,
    playNext,
    nextTrack,
    playPrevious,
    crossfadeDuration,
    setCrossfadeDuration,
    dominantColors,
    setDominantColors,
  } = usePlayerStore();

  const extractedColors = useCoverColors(currentTrack?.albumArt);
  useEffect(() => {
    if (extractedColors) {
      setDominantColors(extractedColors);
    }
  }, [extractedColors, setDominantColors]);

  const {
    openPlaylistModal,
    openVisualizer,
    previousPath,
    isNowPlayingClosing,
    setIsNowPlayingClosing,
  } = useUIStore();
  const [isExiting, setIsExiting] = useState(false);
  const { toggleModal: toggleEqualizerModal, isEnabled: isEqEnabled } = useEqualizerStore();
  const {
    isActive: isSleepTimerActive,
    remainingSeconds: sleepTimerSeconds,
    toggleModal: toggleSleepTimerModal,
  } = useSleepTimerStore();

  const { isLoading, togglePlay, seek } = useAudioPlayer();
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

  const [prevVolume, setPrevVolume] = useState(volume || 1);
  const toggleMute = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      setVolume(0);
    } else {
      setVolume(prevVolume || 0.8);
    }
  };

  const [isDraggingVolume, setIsDraggingVolume] = useState(false);

  const handleVolumePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setIsDraggingVolume(true);
    const bounds = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - bounds.left) / bounds.width));
    setVolume(percent);
  };

  const handleVolumePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingVolume) return;
    const bounds = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - bounds.left) / bounds.width));
    setVolume(percent);
  };

  const handleVolumePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    setIsDraggingVolume(false);
  };

  const cycleCrossfade = () => {
    const durations = [0, 3, 5, 7, 10];
    const currentIndex = durations.indexOf(crossfadeDuration);
    const nextDuration = durations[(currentIndex + 1) % durations.length];
    setCrossfadeDuration(nextDuration);
    if (nextDuration === 0) {
      toast.info('MELØ Osmosis disabled');
    } else {
      toast.success(`MELØ Osmosis set to ${nextDuration}s`);
    }
  };

  const handleExitNowPlaying = () => {
    if (isExiting) return;
    setIsExiting(true);
    setIsNowPlayingClosing(true);
    const hasValidPrev = previousPath && previousPath !== '/now-playing';
    setTimeout(() => {
      if (hasValidPrev) {
        router.back();
      } else {
        router.push('/');
      }
      setTimeout(() => {
        setIsNowPlayingClosing(false);
        setIsExiting(false);
      }, 150);
    }, 320);
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
    return 'MELØ Music';
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
    <motion.div
      initial={{ y: '100%', opacity: 0 }}
      animate={isExiting ? { y: '100%', opacity: 0, scale: 0.96 } : { y: 0, opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28, mass: 0.75 }}
      className="relative isolate min-h-[calc(100vh-5rem)] h-[calc(100vh-5rem)] flex flex-col lg:flex-row gap-6 lg:gap-8 p-4 md:p-6 lg:p-8 overflow-hidden select-none"
    >
      {/* ── Dynamic Cover Art Color Transition Background (From MiniPlayer) ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10 select-none">
        <AnimatePresence mode="popLayout">
          {currentTrack.albumArt ? (
            <motion.div
              key={getTrackId(currentTrack) || currentTrack.title}
              initial={{ opacity: 0, scale: 1.25 }}
              animate={{ opacity: 0.85, scale: 1.45 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.85, ease: 'easeInOut' }}
              className="absolute -inset-24 bg-cover bg-center filter blur-[65px] saturate-[190%]"
              style={{ backgroundImage: `url(${currentTrack.albumArt})` }}
            />
          ) : (
            <motion.div
              key="fallback-ambient"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-br from-purple-950/70 via-zinc-950/90 to-black"
            />
          )}
        </AnimatePresence>

        {/* Deep Dark Vignette for contrast and readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-[#0c071a]/70 to-[#07040d]/90" />

      </div>

      {/* ── Left Half: Cosmic Pulse Centerpiece & Living Player Controls ── */}
      <div className="flex-1 flex flex-col justify-between min-w-0 py-2 relative z-10 overflow-y-auto scrollbar-none pr-1">
        {/* 1. Top Status Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={isExiting ? { opacity: 0, y: 30 } : { opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="flex items-center justify-between w-full max-w-[500px] mx-auto px-2"
        >
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold uppercase tracking-wider text-purple-200 backdrop-blur-md shadow-sm">
            <EqualizerBars isPlaying={isPlaying} size="xs" />
            <span>Now Playing</span>
          </div>

          <div className="text-xs text-zinc-400 font-medium truncate max-w-[200px]" title={playingFromTitle}>
            {playingFromTitle}
          </div>
        </motion.div>

        {/* 2. Centerpiece: Cosmic Pulse Audio Visualizer + Rotating Vinyl Disc */}
        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.75 }}
          animate={isExiting ? { opacity: 0, y: 100, scale: 0.75 } : { opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22, mass: 0.8, delay: isExiting ? 0 : 0.05 }}
          className="relative w-full max-w-[460px] h-48 sm:h-56 mx-auto flex items-center justify-center my-1 group"
        >
          {/* Radial Audio Visualizer Canvas (Cosmic Pulse) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none scale-105">
            <AudioVisualizerCanvas
              mode="radial"
              isPlaying={isPlaying}
              className="w-full h-full"
              centerRadiusRatio={0.38}
            />
          </div>

          {/* Central Rotating Vinyl Album Cover Disc */}
          <div
            className="relative z-20 w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-2 border-white/30 group-hover:scale-105 transition-all duration-500"
            style={{
              boxShadow: dominantColors
                ? `0 0 50px ${addAlpha(dominantColors[0], 0.65)}`
                : '0 0 45px rgba(255, 255, 255, 0.25)',
            }}
          >
            <div
              className={`w-full h-full rounded-full overflow-hidden ${
                isPlaying ? 'animate-spin-slow' : ''
              }`}
            >
              {currentTrack.albumArt ? (
                <img
                  src={currentTrack.albumArt}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover select-none pointer-events-none"
                />
              ) : (
                <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                  <Music2 className="w-12 h-12 text-white/40" />
                </div>
              )}
            </div>

            {/* Vinyl Record Grooves Overlay */}
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,transparent_35%,rgba(0,0,0,0.4)_70%,rgba(0,0,0,0.7)_100%)] pointer-events-none ring-1 ring-inset ring-white/20" />

            {/* Vinyl Spindle Center Hole */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-black/90 border border-white/40 shadow-inner flex items-center justify-center">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor: dominantColors ? dominantColors[0] : 'rgba(255, 255, 255, 0.6)',
                }}
              />
            </div>
          </div>
        </motion.div>

        {/* 3. Track Details & Action Pills */}
        <motion.div
          initial={{ opacity: 0, y: 55, scale: 0.9 }}
          animate={isExiting ? { opacity: 0, y: 80, scale: 0.85 } : { opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 360, damping: 24, delay: isExiting ? 0 : 0.12 }}
          className="w-full max-w-[500px] mx-auto flex flex-col items-center text-center mt-1"
        >
          <div className="flex items-center gap-2 max-w-full">
            <h1
              className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate hover:text-purple-200 transition-colors drop-shadow-md"
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

          <div className="text-sm sm:text-base text-zinc-300 mt-1 truncate max-w-full">
            {currentTrack.artist ? (
              <Link
                href={`/artist/${encodeURIComponent((currentTrack as any).artistId || currentTrack.artist)}`}
                className="hover:text-purple-300 hover:underline transition-colors font-medium"
              >
                {currentTrack.artist}
              </Link>
            ) : (
              'Unknown Artist'
            )}
            {currentTrack.album && (
              <span className="text-zinc-500 font-normal">
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

          {/* Action Pills Row */}
          <div className="flex items-center gap-3 mt-3">
            <motion.button
              whileHover={{ scale: 1.15, y: -2 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleFavoriteToggle}
              className={`p-2 rounded-full border transition-all duration-200 ${
                isFavorite
                  ? 'bg-primary/25 border-primary/50 text-primary shadow-[0_0_15px_rgba(168,85,247,0.35)]'
                  : 'liquid-glass-pill text-zinc-400 hover:text-white'
              }`}
              title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-primary' : ''}`} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.15, y: -2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => openPlaylistModal(currentTrack)}
              className="p-2 rounded-full liquid-glass-pill text-zinc-400 hover:text-white transition-all"
              title="Add to Playlist"
            >
              <Plus className="w-4 h-4" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.15, y: -2 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleShare}
              className="p-2 rounded-full liquid-glass-pill text-zinc-400 hover:text-white transition-all"
              title="Copy link"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </motion.button>
          </div>
        </motion.div>

        {/* 4. Living Progress Bar with Live Timestamps & Smooth Scrubbing */}
        <NowPlayingProgressBar isExiting={isExiting} />

        {/* 5. Living Main Playback Controls Cluster (Jumped from Music Player) */}
        <motion.div
          initial={{ opacity: 0, y: 45, scale: 0.88 }}
          animate={isExiting ? { opacity: 0, y: 50, scale: 0.85 } : { opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 23, delay: isExiting ? 0 : 0.24 }}
          className="w-full max-w-[500px] mx-auto flex items-center justify-center gap-6 sm:gap-7 mt-3"
        >
          {/* Shuffle Button */}
          <motion.button
            whileHover={{ scale: 1.15, y: -2 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleShuffle}
            className={`p-2 rounded-xl transition-all duration-200 ${
              isShuffle
                ? 'text-primary bg-primary/20 shadow-[0_0_12px_rgba(168,85,247,0.35)]'
                : 'text-zinc-400 hover:text-white'
            }`}
            title={isShuffle ? 'Shuffle is ON' : 'Shuffle is OFF'}
          >
            <Shuffle className="w-5 h-5" />
          </motion.button>

          {/* Previous Track */}
          <motion.button
            whileHover={{ scale: 1.15, y: -2 }}
            whileTap={{ scale: 0.9 }}
            onClick={playPrevious}
            className="text-zinc-300 hover:text-white transition-all p-2 rounded-xl hover:bg-white/10"
            title="Previous Track"
          >
            <SkipBack className="w-6 h-6 fill-current" />
          </motion.button>

          {/* Centerpiece Luminescent Play/Pause Button */}
          <motion.button
            whileHover={{ scale: 1.1, y: -2 }}
            whileTap={{ scale: 0.92 }}
            onClick={togglePlay}
            disabled={isLoading}
            className="w-14 h-14 flex items-center justify-center rounded-full bg-white text-black shadow-[0_0_30px_rgba(168,85,247,0.65)] hover:bg-zinc-100 transition-all disabled:opacity-50"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current translate-x-0.5" />
            )}
          </motion.button>

          {/* Next Track */}
          <motion.button
            whileHover={{ scale: 1.15, y: -2 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => nextTrack()}
            className="text-zinc-300 hover:text-white transition-all p-2 rounded-xl hover:bg-white/10"
            title="Next Track"
          >
            <SkipForward className="w-6 h-6 fill-current" />
          </motion.button>

          {/* Autoplay / Infinite Loop */}
          <motion.button
            whileHover={{ scale: 1.15, y: -2 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleAutoplay}
            className={`p-2 rounded-xl transition-all duration-200 ${
              isAutoplayEnabled
                ? 'text-cyan-400 bg-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.35)]'
                : 'text-zinc-400 hover:text-white'
            }`}
            title={isAutoplayEnabled ? 'Autoplay is active' : 'Autoplay is paused'}
          >
            <InfinityIcon className="w-5 h-5" />
          </motion.button>
        </motion.div>

        {/* 6. Living Utilities Control Dock (Volume, EQ, Sleep Timer, Osmosis, Visualizer) */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.92 }}
          animate={isExiting ? { opacity: 0, y: 40, scale: 0.88 } : { opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 25, delay: isExiting ? 0 : 0.3 }}
          className="w-full max-w-[500px] mx-auto flex items-center justify-between gap-3 p-2.5 rounded-2xl liquid-glass-dock border border-white/15 shadow-xl mt-3"
          style={{
            WebkitBackdropFilter: 'blur(20px) saturate(140%)',
            backdropFilter: 'blur(20px) saturate(140%)',
          }}
        >
          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="text-zinc-400 hover:text-white transition-colors p-1"
              title={volume === 0 ? 'Unmute' : 'Mute'}
            >
              {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <div
              className="w-16 sm:w-20 h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer group relative shadow-inner"
              onPointerDown={handleVolumePointerDown}
              onPointerMove={handleVolumePointerMove}
              onPointerUp={handleVolumePointerUp}
              onPointerCancel={handleVolumePointerUp}
              onDoubleClick={toggleMute}
              title={`Volume: ${Math.round(volume * 100)}%`}
            >
              <div
                className="absolute top-0 left-0 h-full bg-zinc-200 group-hover:bg-primary rounded-full transition-colors"
                style={{ width: `${volume * 100}%` }}
              />
            </div>
          </div>

          <div className="w-px h-4 bg-white/15" />

          {/* 10-Band Graphic Equalizer */}
          <motion.button
            whileHover={{ scale: 1.15, y: -1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleEqualizerModal}
            className={`p-1.5 rounded-lg transition-all ${
              isEqEnabled ? 'text-primary hover:text-purple-300' : 'text-zinc-400 hover:text-white'
            }`}
            title="10-Band Graphic Equalizer & Bass Booster"
          >
            <Sliders className="w-4 h-4" />
          </motion.button>

          {/* Sleep Timer */}
          {isSleepTimerActive ? (
            <motion.button
              whileHover={{ scale: 1.1, y: -1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleSleepTimerModal}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.25)]"
              title={`Sleep Timer: ${Math.floor(sleepTimerSeconds / 60)}:${(sleepTimerSeconds % 60).toString().padStart(2, '0')} remaining`}
            >
              <Moon className="w-3 h-3" />
              <span>{Math.floor(sleepTimerSeconds / 60)}:{(sleepTimerSeconds % 60).toString().padStart(2, '0')}</span>
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.15, y: -1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleSleepTimerModal}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white transition-all"
              title="Sleep Timer with smooth fade-out"
            >
              <Moon className="w-4 h-4" />
            </motion.button>
          )}

          {/* MELØ Osmosis Seamless Crossfade */}
          <motion.button
            whileHover={{ scale: 1.08, y: -1 }}
            whileTap={{ scale: 0.92 }}
            onClick={cycleCrossfade}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${
              crossfadeDuration > 0
                ? 'bg-purple-500/15 text-purple-200 border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.25)]'
                : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white'
            }`}
            title={`MELØ Osmosis: ${
              crossfadeDuration === 0 ? 'Off (Click to cycle)' : `${crossfadeDuration}s overlap (Click to change)`
            }`}
          >
            <Sparkles className="w-3 h-3 text-purple-300" />
            <span className="font-semibold">{crossfadeDuration === 0 ? 'Fade Off' : `Fade ${crossfadeDuration}s`}</span>
          </motion.button>

          {/* Real-time Fullscreen Visualizer Modal Button */}
          <motion.button
            whileHover={{ scale: 1.15, y: -1 }}
            whileTap={{ scale: 0.9 }}
            onClick={openVisualizer}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white transition-all"
            title="Open Real-time Audio Visualizer Studio"
          >
            <Waves className="w-4 h-4" />
          </motion.button>
        </motion.div>
      </div>

      {/* ── Right Half: Tabs & Up Next / Autoplay Queue in Liquid Glass ──── */}
      <motion.div
        animate={isExiting ? { y: 60, opacity: 0, scale: 0.96 } : { y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="w-full lg:w-[460px] xl:w-[520px] flex flex-col h-full liquid-glass-card rounded-3xl border border-white/15 overflow-hidden shadow-2xl relative z-10 transform-gpu will-change-transform"
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

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const tracksToSave = [currentTrack, ...userQueueItems.map((i) => i.track)];
                    openPlaylistModal(tracksToSave);
                  }}
                  className="text-xs text-zinc-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/10"
                  title="Save queue as playlist"
                >
                  Save Queue
                </button>
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
      </motion.div>

      {/* ── Living Return Down Arrow at Bottom-Right ────────────────────── */}
      <motion.button
        onClick={handleExitNowPlaying}
        initial={{ opacity: 0, scale: 0, y: 30 }}
        animate={isExiting ? { opacity: 0, scale: 0, y: 30 } : { opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0, y: 30 }}
        whileHover={{ scale: 1.15, y: -3 }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 420, damping: 22, delay: isExiting ? 0 : 0.35 }}
        className="fixed bottom-6 right-8 z-50 flex items-center gap-2.5 px-4 py-3 rounded-full bg-purple-950/75 border border-purple-500/40 text-purple-200 hover:text-white hover:bg-purple-900/90 shadow-[0_10px_35px_rgba(168,85,247,0.45)] backdrop-blur-xl group transition-all"
        title="Return to background page (Restores music player)"
      >
        <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline-block">Return</span>
        <ChevronDown className="w-5 h-5 text-purple-300 group-hover:translate-y-1 transition-transform animate-bounce" />
      </motion.button>
    </motion.div>
  );
}
