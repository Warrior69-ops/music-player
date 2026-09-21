'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Mic2,
  Heart,
  Plus,
  Shuffle,
  ListMusic,
  Sparkles,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  Share2,
  Disc,
  ExternalLink,
  User,
  Sliders,
  Moon,
  Waves,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useFavorites, useAddFavorite, useRemoveFavorite, useLyrics } from '@/hooks/queries';
import { useUIStore } from '@/store/useUIStore';
import { useEqualizerStore } from '@/store/useEqualizerStore';
import { useSleepTimerStore } from '@/store/useSleepTimerStore';
import { EqualizerBars } from '@/components/ui/EqualizerBars';
import { ZigzagProgressBar } from '@/components/ui/ZigzagProgressBar';
import { EqualizerModal } from '@/components/audio/EqualizerModal';
import { SleepTimerModal } from '@/components/audio/SleepTimerModal';
import { AudioVisualizerModal } from '@/components/visualizer/AudioVisualizerModal';
import { toast } from 'sonner';

export function PlayerBar() {
  const router = useRouter();
  const pathname = usePathname();
  const isLyricsPage = pathname === '/lyrics';
  const isNowPlaying = pathname === '/now-playing';

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { toggleModal: toggleEqualizerModal, isEnabled: isEqEnabled } = useEqualizerStore();
  const {
    isActive: isSleepTimerActive,
    remainingSeconds: sleepTimerSeconds,
    toggleModal: toggleSleepTimerModal,
  } = useSleepTimerStore();
  const {
    openVisualizer,
    openPlaylistModal,
    previousPath,
    setPreviousPath,
    isNowPlayingClosing,
    setIsNowPlayingClosing,
  } = useUIStore();

  const shouldShowPlayerBar = !isNowPlaying || isNowPlayingClosing;

  const {
    currentTrack,
    isPlaying,
    volume,
    setVolume,
    nextTrack,
    playPrevious,
    isShuffle,
    toggleShuffle,
    isQueueOpen,
    toggleQueue,
    crossfadeDuration,
    setCrossfadeDuration,
  } = usePlayerStore();

  const { isLoading, togglePlay, seek } = useAudioPlayer();
  const { data: favorites } = useFavorites();
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();

  const { data: lyricsData, isLoading: isLyricsLoading } = useLyrics(
    currentTrack?.title,
    currentTrack?.artist,
    currentTrack?.duration
  );
  const hasLyrics = !!lyricsData && lyricsData.lyrics && lyricsData.lyrics.length > 0;

  const isFavorite = Boolean(
    currentTrack &&
      favorites?.some(
        (f) =>
          f.providerTrackId ===
          (currentTrack.providerTrackId || currentTrack.id)
      )
  );

  // Close 3-dots menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

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

  const [isDraggingVolume, setIsDraggingVolume] = useState(false);

  const handleVolumePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setIsDraggingVolume(true);
    const bounds = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - bounds.left) / bounds.width;
    setVolume(Math.max(0, Math.min(1, percent)));
  };

  const handleVolumePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingVolume) return;
    const bounds = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - bounds.left) / bounds.width;
    setVolume(Math.max(0, Math.min(1, percent)));
  };

  const handleVolumePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    setIsDraggingVolume(false);
  };

  const toggleMute = () => {
    if (volume > 0) setVolume(0);
    else setVolume(1);
  };

  const cycleCrossfade = () => {
    const durations = [0, 3, 5, 7, 10];
    const currentIndex = durations.indexOf(crossfadeDuration);
    const nextDuration = durations[(currentIndex + 1) % durations.length];
    setCrossfadeDuration(nextDuration);
    if (nextDuration === 0) {
      toast.info('Nocturne Osmosis disabled');
    } else {
      toast.success(`Nocturne Osmosis set to ${nextDuration}s`);
    }
  };

  const toggleNowPlaying = () => {
    if (!currentTrack) return;
    if (isNowPlaying) {
      setIsNowPlayingClosing(true);
      const dest = previousPath && previousPath !== '/now-playing' ? previousPath : '/';
      setTimeout(() => {
        router.push(dest);
        setTimeout(() => setIsNowPlayingClosing(false), 150);
      }, 320);
    } else {
      setPreviousPath(pathname);
      router.push('/now-playing');
    }
  };

  const handleCopyLink = () => {
    if (!currentTrack) return;
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Track link copied to clipboard');
      setIsMenuOpen(false);
    }
  };

  return (
    <div className="relative z-50 select-none">
      <AnimatePresence mode="wait">
        {shouldShowPlayerBar && (
          <motion.div
            key="player-bar-bottom-dock"
            initial={{ y: 90, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 90, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28, mass: 0.75 }}
            className="relative px-3 pb-2.5 pt-0"
          >
            {/* ── Apple iOS Liquid Glass Ambient Backdrop (Directly behind the Music Bar) ── */}
      {currentTrack?.albumArt ? (
        <div className="absolute inset-x-3 bottom-2.5 top-0 rounded-2xl overflow-hidden pointer-events-none z-0">
          <div
            className="absolute -inset-10 bg-cover bg-center filter blur-[20px] opacity-90 scale-110 transition-all duration-700 transform-gpu will-change-transform"
            style={{ backgroundImage: `url(${currentTrack.albumArt})` }}
          />
          {/* Subtle translucent scrim to maintain contrast while showing album art blurly */}
          <div className="absolute inset-0 bg-black/20" />
        </div>
      ) : (
        <div className="absolute inset-x-3 bottom-2.5 top-0 rounded-2xl overflow-hidden pointer-events-none z-0">
          <div className="absolute -inset-10 bg-gradient-to-r from-purple-900/30 via-violet-800/20 to-purple-900/30 blur-[24px]" />
          <div className="absolute inset-0 bg-[#07040d]/40" />
        </div>
      )}

      {/* Refined Dock with Liquid Glass Optics (Height reduced by 20% to 76px) */}
      <div
        className="relative z-10 h-[76px] liquid-glass-dock rounded-2xl flex items-center justify-between px-5 transition-all duration-300 transform-gpu will-change-transform"
        style={{
          WebkitBackdropFilter: 'blur(20px) saturate(140%)',
          backdropFilter: 'blur(20px) saturate(140%)',
        }}
      >
        {/* ── Left Section: Track Info, Favorite & 3-Dots Menu ──────────── */}
        <div className="w-[30%] flex items-center gap-2.5 min-w-0">
          {/* Clickable Album Thumbnail (Opens Now Playing) */}
          <div
            onClick={toggleNowPlaying}
            className="relative w-11 h-11 rounded-xl overflow-hidden bg-white/5 border border-white/10 shadow-sm shrink-0 group cursor-pointer hover:border-purple-500/50 transition-all hover:scale-105 active:scale-95"
            title={isNowPlaying ? 'Now Playing screen open' : 'Click to open Now Playing'}
          >
            {currentTrack?.albumArt ? (
              <img
                src={currentTrack.albumArt}
                alt={currentTrack.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-white/5">
                <div className="w-4 h-4 rounded-full bg-white/10" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <ChevronUp className="w-3.5 h-3.5 text-white drop-shadow" />
            </div>
          </div>

          {/* Title & Artist */}
          <div className="flex flex-col min-w-0 justify-center flex-1">
            <div className="flex items-center gap-2 min-w-0">
              {currentTrack && (
                <div className="shrink-0 flex items-center" title={isPlaying ? 'Playing' : 'Paused'}>
                  <EqualizerBars isPlaying={isPlaying} size="xs" />
                </div>
              )}
              <span
                onClick={toggleNowPlaying}
                className="text-sm font-semibold text-white truncate tracking-tight hover:text-purple-200 transition-colors cursor-pointer"
                title={currentTrack?.title || 'No track playing'}
              >
                {currentTrack?.title || 'No track selected'}
              </span>
            </div>

            <div className="text-xs text-zinc-400 truncate mt-0.5">
              {currentTrack?.artist ? (
                <Link
                  href={`/artist/${encodeURIComponent(
                    (currentTrack as any).artistId || currentTrack.artist
                  )}`}
                  className="hover:text-white hover:underline transition-colors"
                >
                  {currentTrack.artist}
                </Link>
              ) : (
                'Choose a song to start listening'
              )}
            </div>
          </div>

          {/* Quick Actions (Favorite & 3-Dots Menu) beside track info */}
          {currentTrack && (
            <div className="flex items-center gap-1 shrink-0 ml-1">
              {/* Favorite Heart Button */}
              <button
                onClick={handleFavoriteToggle}
                className="p-1.5 text-zinc-400 hover:text-white hover:scale-110 active:scale-95 transition-all"
                title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-primary text-primary' : ''}`} />
              </button>

              {/* 3-Dots Options Menu Button */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className={`p-1.5 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 ${
                    isMenuOpen ? 'text-primary bg-white/10' : 'text-zinc-400 hover:text-white'
                  }`}
                  title="More Options"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {/* Liquid Glass Dropdown Popup Menu */}
                {isMenuOpen && (
                  <div
                    className="absolute bottom-12 left-0 w-56 rounded-2xl p-1.5 z-50 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85)] border border-white/20 animate-in fade-in zoom-in-95 duration-150 transform-gpu will-change-transform"
                    style={{
                      WebkitBackdropFilter: 'blur(20px) saturate(140%)',
                      backdropFilter: 'blur(20px) saturate(140%)',
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.04) 100%), rgba(20, 12, 36, 0.45)',
                    }}
                  >
                    {/* Apple iOS Deep Blurred Album Art inside Dropdown */}
                    {currentTrack?.albumArt && (
                      <div className="absolute -inset-10 overflow-hidden pointer-events-none -z-10">
                        <div
                          className="absolute -inset-8 bg-cover bg-center filter blur-[18px] opacity-85 scale-120 transition-all duration-500"
                          style={{ backgroundImage: `url(${currentTrack.albumArt})` }}
                        />
                        <div className="absolute inset-0 bg-black/25" />
                      </div>
                    )}
                    <button
                      onClick={() => {
                        openPlaylistModal(currentTrack);
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                    >
                      <Plus className="w-4 h-4 text-purple-300" />
                      <span>Add to Playlist</span>
                    </button>

                    <button
                      onClick={() => {
                        handleFavoriteToggle();
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                    >
                      <Heart className={`w-4 h-4 ${isFavorite ? 'fill-primary text-primary' : 'text-zinc-400'}`} />
                      <span>{isFavorite ? 'Remove Favorite' : 'Add to Favorites'}</span>
                    </button>

                    {(currentTrack as any).artistId || currentTrack.artist ? (
                      <Link
                        href={`/artist/${encodeURIComponent(
                          (currentTrack as any).artistId || currentTrack.artist
                        )}`}
                        onClick={() => setIsMenuOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                      >
                        <User className="w-4 h-4 text-zinc-400" />
                        <span>Go to Artist</span>
                      </Link>
                    ) : null}

                    {currentTrack.albumId ? (
                      <Link
                        href={`/album/${encodeURIComponent(currentTrack.albumId)}`}
                        onClick={() => setIsMenuOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                      >
                        <Disc className="w-4 h-4 text-zinc-400" />
                        <span>Go to Album</span>
                      </Link>
                    ) : null}

                    <button
                      onClick={() => {
                        toggleNowPlaying();
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 text-zinc-400" />
                      <span>{isNowPlaying ? 'Minimize Now Playing' : 'Open Now Playing'}</span>
                    </button>

                    <div className="w-full h-px bg-white/10 my-1" />

                    <button
                      onClick={handleCopyLink}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                    >
                      <Share2 className="w-4 h-4 text-zinc-400" />
                      <span>Copy Share Link</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Center Section: Controls & Aesthetic Zigzag Progress Bar ── */}
        <div className="flex flex-col items-center justify-center flex-1 max-w-xl px-3 gap-0.5">
          {/* Playback Button Row */}
          <div className="flex items-center gap-4">
            {/* Shuffle */}
            <button
              onClick={toggleShuffle}
              className={`p-1.5 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 ${
                isShuffle
                  ? 'text-primary'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title={isShuffle ? 'Shuffle is ON (Click to turn OFF)' : 'Shuffle is OFF (Click to turn ON)'}
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>

            {/* Previous Track */}
            <button
              onClick={playPrevious}
              className="text-zinc-300 hover:text-white hover:scale-110 active:scale-95 transition-all p-1"
              title="Previous Track"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            {/* Minimalist White Play/Pause Button */}
            <button
              onClick={togglePlay}
              disabled={!currentTrack || isLoading}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white text-black hover:scale-105 active:scale-95 shadow-md hover:bg-zinc-100 transition-all disabled:opacity-50 disabled:hover:scale-100"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current translate-x-0.5" />
              )}
            </button>

            {/* Next Track */}
            <button
              onClick={() => nextTrack()}
              className="text-zinc-300 hover:text-white hover:scale-110 active:scale-95 transition-all p-1"
              title="Next Track"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>
          </div>

          {/* Aesthetic Zigzag Waveform Progress Bar */}
          <ZigzagProgressBar
            onSeek={seek}
            isPlaying={isPlaying}
          />
        </div>

        {/* ── Right Section: Crossfade Toggle & Utilities ────────────── */}
        <div className="w-[30%] flex items-center justify-end gap-2.5">
          {/* Audio Visualizer Button */}
          <button
            onClick={openVisualizer}
            disabled={!currentTrack}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white transition-all hover:scale-110 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Real-time Audio Visualizer"
          >
            <Waves className="w-4.5 h-4.5" />
          </button>

          {/* 10-Band Graphic Equalizer Button */}
          <button
            onClick={toggleEqualizerModal}
            className={`p-1.5 rounded-lg transition-all hover:scale-110 active:scale-95 ${
              isEqEnabled
                ? 'text-primary hover:text-purple-300'
                : 'text-zinc-500 hover:text-white'
            }`}
            title="10-Band Graphic Equalizer & Bass Booster"
          >
            <Sliders className="w-4.5 h-4.5" />
          </button>

          {/* Sleep Timer Button */}
          {isSleepTimerActive ? (
            <button
              onClick={toggleSleepTimerModal}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.25)] hover:scale-105 active:scale-95 transition-all"
              title={`Sleep Timer: ${Math.floor(sleepTimerSeconds / 60)}:${(sleepTimerSeconds % 60).toString().padStart(2, '0')} remaining`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>{Math.floor(sleepTimerSeconds / 60)}:{(sleepTimerSeconds % 60).toString().padStart(2, '0')}</span>
            </button>
          ) : (
            <button
              onClick={toggleSleepTimerModal}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white transition-all hover:scale-110 active:scale-95"
              title="Sleep Timer with smooth fade-out"
            >
              <Moon className="w-4.5 h-4.5" />
            </button>
          )}

          {/* Nocturne Osmosis Seamless Crossfade Toggle Pill */}
          <button
            onClick={cycleCrossfade}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all duration-200 hover:scale-105 active:scale-95 ${
              crossfadeDuration > 0
                ? 'bg-purple-500/15 text-purple-200 border-purple-500/30'
                : 'bg-white/5 text-zinc-400 border-white/10 hover:text-white'
            }`}
            title={`Nocturne Osmosis: ${
              crossfadeDuration === 0 ? 'Off (Click to cycle)' : `${crossfadeDuration}s overlap (Click to change)`
            }`}
          >
            <Sparkles className="w-3 h-3 text-purple-300" />
            <span className="font-semibold">{crossfadeDuration === 0 ? 'Fade Off' : `Fade ${crossfadeDuration}s`}</span>
          </button>

          {/* Lyrics Button */}
          {currentTrack ? (
            isLyricsPage ? (
              <button
                onClick={() => {
                  if (typeof window !== 'undefined' && window.history.length > 1) {
                    router.back();
                  } else {
                    router.push('/');
                  }
                }}
                className="p-1.5 rounded-lg flex items-center justify-center hover:scale-110 active:scale-95 text-primary bg-primary/20 transition-all"
                title="Minimize Lyrics"
              >
                <Mic2 className="w-4.5 h-4.5 text-primary" />
              </button>
            ) : (
              <Link
                href="/lyrics"
                className={`p-1.5 rounded-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all ${
                  hasLyrics
                    ? 'text-primary hover:text-white'
                    : isLyricsLoading
                    ? 'text-zinc-500 animate-pulse'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title={
                  hasLyrics
                    ? 'Lyrics (Synchronized Available)'
                    : isLyricsLoading
                    ? 'Searching lyrics...'
                    : 'Lyrics'
                }
              >
                <Mic2 className="w-4.5 h-4.5" />
              </Link>
            )
          ) : (
            <div className="text-zinc-600 cursor-not-allowed p-1.5" title="No track playing">
              <Mic2 className="w-4.5 h-4.5" />
            </div>
          )}

          {/* Playback Queue Drawer */}
          <button
            onClick={toggleQueue}
            className={`p-1.5 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 ${
              isQueueOpen
                ? 'text-primary bg-primary/20'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Playback Queue"
          >
            <ListMusic className="w-4.5 h-4.5" />
          </button>

          {/* Subtle Vertical Divider */}
          <div className="w-px h-4 bg-white/10 mx-0.5" />

          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="text-zinc-400 hover:text-white transition-colors"
              title={volume === 0 ? 'Unmute' : 'Mute'}
            >
              {volume === 0 ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
            </button>
            <div
              className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer group relative shadow-inner"
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

          {/* Subtle Vertical Divider */}
          <div className="w-px h-4 bg-white/10 mx-0.5" />

          {/* ── Bidirectional Now Playing Arrow Button ─────────────── */}
          <button
            onClick={toggleNowPlaying}
            disabled={!currentTrack}
            className={`p-2 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 border ${
              isNowPlaying
                ? 'bg-purple-500/25 text-purple-200 border-purple-500/40 shadow-[0_0_16px_rgba(168,85,247,0.35)]'
                : 'liquid-glass-pill text-zinc-300 hover:text-white'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
            title={
              isNowPlaying
                ? 'Minimize - Return to previous page'
                : 'Open Now Playing screen'
            }
          >
            {isNowPlaying ? (
              <ChevronDown className="w-4.5 h-4.5 text-purple-300" />
            ) : (
              <ChevronUp className="w-4.5 h-4.5 text-zinc-300 group-hover:text-white transition-colors" />
            )}
          </button>
        </div>
      </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feature Modals */}
      <EqualizerModal />
      <SleepTimerModal />
      <AudioVisualizerModal />
    </div>
  );
}
