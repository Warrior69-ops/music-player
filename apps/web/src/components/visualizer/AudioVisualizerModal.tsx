'use client';

import React, { useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Waves,
  BarChart3,
  Disc,
  Maximize2,
  Minimize2,
  Music2,
} from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useAudioPlayer, useAudioStateStore } from '@/hooks/useAudioPlayer';
import { useUIStore } from '@/store/useUIStore';
import { AudioVisualizerCanvas, addAlpha } from './AudioVisualizerCanvas';
import { useCoverColors } from '@/hooks/useCoverColors';
import { motion, AnimatePresence } from 'framer-motion';

export function AudioVisualizerModal() {
  const { isVisualizerOpen, closeVisualizer, visualizerMode, setVisualizerMode } = useUIStore();
  const { currentTrack, isPlaying, nextTrack, prevTrack, dominantColors, setDominantColors } = usePlayerStore();
  const { togglePlay, seek } = useAudioPlayer();
  const { currentTime, duration } = useAudioStateStore();

  const extractedColors = useCoverColors(currentTrack?.albumArt);
  useEffect(() => {
    if (extractedColors) {
      setDominantColors(extractedColors);
    }
  }, [extractedColors, setDominantColors]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisualizerOpen) {
        closeVisualizer();
      } else if (e.code === 'Space' && isVisualizerOpen && e.target === document.body) {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisualizerOpen, closeVisualizer, togglePlay]);

  if (!isVisualizerOpen) return null;

  function formatDuration(seconds?: number): string {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 flex flex-col justify-between overflow-hidden select-none"
      >
        {/* Ambient album glow behind visualizer canvas */}
        {currentTrack?.albumArt && (
          <div
            className="absolute inset-0 bg-cover bg-center filter blur-[120px] opacity-35 scale-125 pointer-events-none transform-gpu will-change-transform"
            style={{ backgroundImage: `url(${currentTrack.albumArt})` }}
          />
        )}

        {/* ── Visualizer Canvas Layer ───────────────────────────────────── */}
        <div className="absolute inset-0 z-0">
          <AudioVisualizerCanvas mode={visualizerMode} isPlaying={isPlaying} />
        </div>

        {/* ── Top Header Navigation Bar (Floating Liquid Glass) ─────────── */}
        <div className="relative z-10 p-6 flex items-center justify-between">
          {/* Left: Branding & Current Mode */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
              <Waves className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wider uppercase text-white drop-shadow">
                MELØ Visualizer
              </h2>
              <p className="text-[11px] text-zinc-400">
                Real-time frequency & audio reactive dynamics
              </p>
            </div>
          </div>

          {/* Center: Mode Switcher Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-full liquid-glass-pill border border-white/15 bg-black/30">
            {[
              { id: 'waves', label: 'Aurora Waves', icon: Waves },
              { id: 'bars', label: 'Glass Bars', icon: BarChart3 },
              { id: 'radial', label: 'Cosmic Pulse', icon: Disc },
            ].map(({ id, label, icon: Icon }) => {
              const isActive = visualizerMode === id;
              return (
                <button
                  key={id}
                  onClick={() => setVisualizerMode(id as any)}
                  className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="visualizerModePill"
                      className="absolute inset-0 rounded-full bg-primary/30 border border-primary/50 shadow-[0_0_15px_rgba(168,85,247,0.35)]"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <Icon className="w-3.5 h-3.5 relative z-10" />
                  <span className="relative z-10">{label}</span>
                </button>
              );
            })}
          </div>

          {/* Right: Close / Minimize */}
          <div className="flex items-center gap-2">
            <button
              onClick={closeVisualizer}
              className="p-2.5 rounded-2xl liquid-glass-pill border border-white/15 text-zinc-300 hover:text-white hover:scale-110 active:scale-95 transition-all shadow-lg"
              title="Close Fullscreen Visualizer (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Centerpiece Artwork Accent (Visible in Cosmic & Ambient modes) ── */}
        {visualizerMode === 'radial' && currentTrack && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 flex flex-col items-center">
            <div
              className="relative w-36 h-36 sm:w-48 sm:h-48 rounded-full overflow-hidden border-2 border-white/30 animate-spin-slow transition-all duration-500"
              style={{
                boxShadow: dominantColors
                  ? `0 0 55px ${addAlpha(dominantColors[0], 0.65)}`
                  : '0 0 45px rgba(255, 255, 255, 0.25)',
              }}
            >
              {currentTrack.albumArt ? (
                <img
                  src={currentTrack.albumArt}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                  <Music2 className="w-12 h-12 text-white/30" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Bottom Floating Playback Controller Dock ──────────────────── */}
        <div className="relative z-10 p-6 flex justify-center pb-8">
          <div
            className="w-full max-w-2xl liquid-glass-card rounded-3xl border border-white/15 p-4 sm:p-5 shadow-[0_20px_50px_rgba(0,0,0,0.85)] flex flex-col gap-3"
            style={{
              WebkitBackdropFilter: 'blur(30px) saturate(135%)',
              backdropFilter: 'blur(30px) saturate(135%)',
            }}
          >
            {/* Track Info & Main Transport Buttons */}
            <div className="flex items-center justify-between gap-4">
              {/* Left: Track Thumbnail & Titles */}
              <div className="flex items-center gap-3.5 min-w-0 max-w-[45%]">
                {currentTrack?.albumArt ? (
                  <img
                    src={currentTrack.albumArt}
                    alt={currentTrack.title}
                    className="w-12 h-12 rounded-xl object-cover shadow-md shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <Music2 className="w-5 h-5 text-white/40" />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">
                    {currentTrack?.title || 'No track playing'}
                  </h3>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">
                    {currentTrack?.artist || 'Select a song'}
                  </p>
                </div>
              </div>

              {/* Center: Playback Controls */}
              <div className="flex items-center gap-3">
                <button
                  onClick={prevTrack}
                  className="p-2 text-zinc-300 hover:text-white hover:scale-110 active:scale-95 transition-all"
                  title="Previous Track"
                >
                  <SkipBack className="w-5 h-5 fill-current" />
                </button>

                <button
                  onClick={togglePlay}
                  className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 shadow-lg transition-all"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current translate-x-0.5" />
                  )}
                </button>

                <button
                  onClick={nextTrack}
                  className="p-2 text-zinc-300 hover:text-white hover:scale-110 active:scale-95 transition-all"
                  title="Next Track"
                >
                  <SkipForward className="w-5 h-5 fill-current" />
                </button>
              </div>

              {/* Right: Durations */}
              <div className="text-xs font-mono font-medium text-zinc-400 text-right min-w-[70px]">
                <span>{formatDuration(currentTime)}</span>
                <span className="text-zinc-600 mx-1">/</span>
                <span>{formatDuration(duration)}</span>
              </div>
            </div>

            {/* Seek Bar */}
            <div
              className="relative h-1.5 bg-white/15 rounded-full overflow-hidden cursor-pointer group"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                seek(pos * duration);
              }}
            >
              <div
                className="absolute top-0 left-0 h-full bg-primary group-hover:bg-purple-300 rounded-full transition-colors"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
