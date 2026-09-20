'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Sparkles,
  Play,
  Download,
  Share2,
  ChevronLeft,
  ChevronRight,
  Music2,
  Trophy,
  Flame,
  Clock,
  Disc,
} from 'lucide-react';
import { ListeningStats } from '@/hooks/queries';
import { usePlayerStore, Track } from '@/store/usePlayerStore';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface WrappedModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats?: ListeningStats | null;
  userName?: string;
}

export function WrappedModal({ isOpen, onClose, stats, userName = 'You' }: WrappedModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [mounted, setMounted] = useState(false);
  const totalSlides = 5;
  const { setCurrentTrack } = usePlayerStore();
  const cardCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setCurrentSlide(0);
    }
  }, [isOpen]);

  const nextSlide = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentSlide]);

  if (!isOpen || !mounted) return null;

  const topTrack = stats?.topTracks?.[0];
  const topArtist = stats?.topArtists?.[0];
  const persona = stats?.persona || {
    title: 'Cosmic Nocturne Explorer',
    description: 'Drifting through nocturnal melodies and ambient frequencies.',
  };

  // ── High-Res Native Canvas 2D Export ──────────────────────────────────────
  const handleDownloadCard = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920; // 9:16 Instagram Story aspect ratio
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Rich Dark Cosmic Background
    const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
    bgGrad.addColorStop(0, '#090514');
    bgGrad.addColorStop(0.5, '#1e0b36');
    bgGrad.addColorStop(1, '#05020a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Glowing colorful aura orbs
    const orbGrad1 = ctx.createRadialGradient(250, 400, 50, 250, 400, 500);
    orbGrad1.addColorStop(0, 'rgba(168, 85, 247, 0.45)');
    orbGrad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = orbGrad1;
    ctx.beginPath();
    ctx.arc(250, 400, 500, 0, Math.PI * 2);
    ctx.fill();

    const orbGrad2 = ctx.createRadialGradient(850, 1400, 50, 850, 1400, 600);
    orbGrad2.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
    orbGrad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = orbGrad2;
    ctx.beginPath();
    ctx.arc(850, 1400, 600, 0, Math.PI * 2);
    ctx.fill();

    // Liquid Glass Center Card
    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 3;
    roundRect(ctx, 100, 260, 880, 1400, 48);
    ctx.fill();
    ctx.stroke();

    // Brand Header
    ctx.fillStyle = '#c084fc';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('NOCTURNE MUSIC', 180, 360);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 64px sans-serif';
    ctx.fillText(`${userName.toUpperCase()}'S WRAPPED`, 180, 440);

    // Stat 1: Total Time
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('TOTAL MINUTES LISTENED', 180, 560);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 84px sans-serif';
    ctx.fillText(`${(stats?.totalMinutes || 0).toLocaleString()} MINS`, 180, 650);

    // Stat 2: Top Anthem
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('#1 TOP ANTHEM', 180, 770);
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 52px sans-serif';
    ctx.fillText((topTrack?.title || 'Celestial Beats').slice(0, 26), 180, 835);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '36px sans-serif';
    const anthemMinutes = topTrack?.minutesStreamed ?? (topTrack ? Math.max(1, Math.round(((topTrack.duration || 180) * (topTrack.playCount || 1)) / 60)) : 0);
    ctx.fillText(`${topTrack?.artist || 'Nocturne Artist'} • ${anthemMinutes.toLocaleString()} MINS STREAMED`, 180, 890);

    // Stat 3: Top Artist
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('#1 TOP ARTIST', 180, 1020);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 56px sans-serif';
    ctx.fillText(topArtist?.name || 'Various Artists', 180, 1090);

    // Stat 4: Sonic Persona Badge
    ctx.fillStyle = 'rgba(168, 85, 247, 0.25)';
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
    ctx.lineWidth = 2;
    roundRect(ctx, 180, 1180, 720, 170, 30);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText(persona.title, 220, 1250);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '28px sans-serif';
    ctx.fillText(persona.description.slice(0, 48), 220, 1300);

    // Footer
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('LISTEN WITH NOCTURNE • LIQUID GLASS AUDIO', 260, 1540);

    // Trigger Download
    const link = document.createElement('a');
    link.download = `Nocturne_Wrapped_${userName}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('Wrapped story card downloaded!');
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 select-none overflow-hidden">
        {/* Full-screen Dark Blur Backdrop covering header, sidebar, and footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/90 backdrop-blur-2xl"
        />

        {/* Modal Story Box - strictly bounded to viewport height with ample margins */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          className="relative w-full max-w-[390px] h-[min(82vh,660px)] rounded-3xl overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.95)] border border-white/20 z-10 flex flex-col justify-between my-auto"
          style={{
            background: 'linear-gradient(145deg, #130924 0%, #2b1055 50%, #0a0316 100%)',
          }}
        >
          {/* Animated Background Aura Orbs */}
          <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-purple-600/35 blur-[90px] pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-cyan-600/30 blur-[90px] pointer-events-none" />

          {/* Top Progress Segment Bars */}
          <div className="relative z-20 pt-4 px-4">
            <div className="flex items-center gap-1.5 mb-3">
              {Array.from({ length: totalSlides }).map((_, idx) => (
                <div key={idx} className="flex-1 h-1 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      idx < currentSlide
                        ? 'w-full bg-white'
                        : idx === currentSlide
                        ? 'w-full bg-primary shadow-[0_0_10px_#a855f7]'
                        : 'w-0'
                    }`}
                  />
                </div>
              ))}
            </div>

            {/* Header: Title & Close */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-primary/20 text-primary">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-white">
                  Nocturne Wrapped
                </span>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-full bg-black/40 text-white/70 hover:text-white hover:bg-black/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Story Content Slides ───────────────────────────────────── */}
          <div className="relative z-10 flex-1 flex items-center justify-center p-6 text-center">
            <AnimatePresence mode="wait">
              {/* SLIDE 1: Total Listening Time */}
              {currentSlide === 0 && (
                <motion.div
                  key="slide0"
                  initial={{ opacity: 0, y: 25 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -25 }}
                  className="flex flex-col items-center space-y-4"
                >
                  <div className="w-20 h-20 rounded-3xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-primary shadow-[0_0_30px_rgba(168,85,247,0.4)]">
                    <Clock className="w-10 h-10" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                    Your Musical Footprint
                  </span>
                  <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                    {(stats?.totalMinutes || 0).toLocaleString()}
                    <span className="block text-2xl text-zinc-400 font-semibold mt-1">minutes</span>
                  </h2>
                  <p className="text-sm text-zinc-300 max-w-xs">
                    That&apos;s roughly {stats?.totalHours || 0} hours of pure rhythm and soundscapes explored on Nocturne.
                  </p>
                </motion.div>
              )}

              {/* SLIDE 2: Top Artist Spotlight */}
              {currentSlide === 1 && (
                <motion.div
                  key="slide1"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  className="flex flex-col items-center space-y-4"
                >
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                    Your Top Artist
                  </span>

                  <div className="relative w-36 h-36 rounded-full overflow-hidden border-2 border-cyan-400/50 shadow-[0_0_40px_rgba(6,182,212,0.4)]">
                    {topArtist?.thumbnail ? (
                      <img
                        src={topArtist.thumbnail}
                        alt={topArtist.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-cyan-950 flex items-center justify-center">
                        <Disc className="w-12 h-12 text-cyan-300/40" />
                      </div>
                    )}
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black text-white">
                    {topArtist?.name || 'Various Artists'}
                  </h2>
                  <p className="text-sm text-zinc-300 max-w-xs">
                    You streamed this artist {topArtist?.plays || 1} times, making them the defining soundtrack of your sessions.
                  </p>
                </motion.div>
              )}

              {/* SLIDE 3: Top Anthem Track */}
              {currentSlide === 2 && (
                <motion.div
                  key="slide2"
                  initial={{ opacity: 0, y: 25 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -25 }}
                  className="flex flex-col items-center space-y-4"
                >
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>Your #1 Anthem</span>
                  </div>

                  <div className="w-40 h-40 rounded-3xl overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.8)] border border-white/20">
                    {topTrack?.albumArt ? (
                      <img
                        src={topTrack.albumArt}
                        alt={topTrack.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-purple-950 flex items-center justify-center">
                        <Music2 className="w-12 h-12 text-white/30" />
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-white line-clamp-2">
                      {topTrack?.title || 'Unknown Anthem'}
                    </h3>
                    <p className="text-sm text-zinc-400 mt-0.5">{topTrack?.artist || 'Artist'}</p>
                    <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-200 text-xs font-semibold">
                      <Clock className="w-3 h-3 text-purple-300" />
                      <span>
                        {(topTrack?.minutesStreamed ?? (topTrack ? Math.max(1, Math.round(((topTrack.duration || 180) * (topTrack.playCount || 1)) / 60)) : 0)).toLocaleString()} mins streamed
                      </span>
                    </div>
                  </div>

                  {topTrack && (
                    <button
                      onClick={() => setCurrentTrack(topTrack)}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black font-bold text-xs hover:scale-105 active:scale-95 transition-all shadow-lg"
                    >
                      <Play className="w-3.5 h-3.5 fill-black" />
                      <span>Play Track</span>
                    </button>
                  )}
                </motion.div>
              )}

              {/* SLIDE 4: Sonic Persona */}
              {currentSlide === 3 && (
                <motion.div
                  key="slide3"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  className="flex flex-col items-center space-y-5"
                >
                  <div className="p-4 rounded-3xl bg-gradient-to-br from-primary/30 to-fuchsia-600/30 border border-primary/40 shadow-[0_0_40px_rgba(168,85,247,0.4)]">
                    <Flame className="w-12 h-12 text-primary" />
                  </div>

                  <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                    Your Musical Identity
                  </span>

                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {persona.title}
                  </h2>

                  <p className="text-sm text-zinc-300 max-w-xs leading-relaxed">
                    {persona.description}
                  </p>
                </motion.div>
              )}

              {/* SLIDE 5: Final Shareable Card */}
              {currentSlide === 4 && (
                <motion.div
                  key="slide4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="w-full flex flex-col items-center space-y-4"
                >
                  {/* Miniature Preview Card */}
                  <div
                    className="w-full p-5 rounded-3xl liquid-glass-card border border-white/20 text-left space-y-3 shadow-2xl"
                    style={{
                      WebkitBackdropFilter: 'blur(20px) saturate(135%)',
                      backdropFilter: 'blur(20px) saturate(135%)',
                    }}
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-purple-300">
                        Nocturne Wrapped
                      </span>
                      <span className="text-xs font-bold text-white">{userName}</span>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase font-bold text-zinc-400">Total Streamed</div>
                      <div className="text-xl font-black text-white">
                        {(stats?.totalMinutes || 0).toLocaleString()} mins
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-zinc-400">#1 Anthem</div>
                        <div className="font-bold text-primary truncate">
                          {topTrack?.title || 'Song'}
                        </div>
                        <div className="text-[10px] text-purple-300 font-mono">
                          {topTrack ? `${(topTrack.minutesStreamed ?? Math.max(1, Math.round(((topTrack.duration || 180) * (topTrack.playCount || 1)) / 60))).toLocaleString()} mins` : ''}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-zinc-400">Top Artist</div>
                        <div className="font-bold text-cyan-300 truncate">
                          {topArtist?.name || 'Artist'}
                        </div>
                        <div className="text-[10px] text-cyan-300 font-mono">
                          {topArtist?.plays ? `${topArtist.plays} plays` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] font-semibold text-purple-200">
                      ⚡ {persona.title}
                    </div>
                  </div>

                  {/* Share & Download Buttons */}
                  <div className="w-full flex items-center gap-2 pt-2">
                    <button
                      onClick={handleDownloadCard}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white text-black font-bold text-xs hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95 shadow-lg"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Story Card</span>
                    </button>

                    <button
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          navigator.clipboard.writeText(window.location.href);
                          toast.success('Stats link copied to clipboard!');
                        }
                      }}
                      className="p-3 rounded-2xl liquid-glass-pill border border-white/15 text-white hover:scale-105 active:scale-95 transition-all"
                      title="Copy link"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Bottom Nav Buttons ─────────────────────────────────────── */}
          <div className="relative z-20 pb-5 px-6 flex items-center justify-between">
            <button
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className="p-2 rounded-full text-zinc-400 hover:text-white disabled:opacity-20 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <span className="text-[11px] font-mono text-zinc-500">
              {currentSlide + 1} / {totalSlides}
            </span>

            <button
              onClick={nextSlide}
              className="p-2 rounded-full text-zinc-400 hover:text-white transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
