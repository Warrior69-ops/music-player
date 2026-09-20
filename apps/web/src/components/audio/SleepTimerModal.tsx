'use client';

import React, { useState } from 'react';
import {
  X,
  Moon,
  Clock,
  Music,
  Plus,
  RotateCcw,
  Volume2,
} from 'lucide-react';
import { useSleepTimerStore } from '@/store/useSleepTimerStore';
import { useAudioStateStore } from '@/hooks/useAudioPlayer';
import { usePlayerStore } from '@/store/usePlayerStore';
import { motion, AnimatePresence } from 'framer-motion';

export function SleepTimerModal() {
  const {
    isActive,
    mode,
    totalSeconds,
    remainingSeconds,
    isFadingOut,
    isModalOpen,
    startTimer,
    startEndOfSongTimer,
    addTime,
    cancelTimer,
    setIsModalOpen,
  } = useSleepTimerStore();

  const { duration, currentTime } = useAudioStateStore();
  const { currentTrack } = usePlayerStore();
  const [customMins, setCustomMins] = useState('');

  if (!isModalOpen) return null;

  function formatTime(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  const remainingSongSec = Math.max(0, Math.round(duration - currentTime));

  const handleStartCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customMins, 10);
    if (!isNaN(val) && val > 0) {
      startTimer(val);
      setCustomMins('');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
        {/* Backdrop blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsModalOpen(false)}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          className="relative w-full max-w-md liquid-glass-card rounded-3xl border border-white/15 overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.8)] z-10"
          style={{
            WebkitBackdropFilter: 'blur(30px) saturate(135%)',
            backdropFilter: 'blur(30px) saturate(135%)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Sleep Timer
                  {isActive && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse">
                      Running
                    </span>
                  )}
                </h3>
                <p className="text-xs text-zinc-400">
                  {isActive
                    ? 'Countdown in progress with gentle fade-out'
                    : 'Stop playback automatically with smooth fade-out'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsModalOpen(false)}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            {isActive ? (
              /* Active Timer State */
              <div className="flex flex-col items-center text-center space-y-6">
                {/* Circular Progress Ring with Digital Readout */}
                <div className="relative w-44 h-44 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="88"
                      cy="88"
                      r="76"
                      stroke="currentColor"
                      strokeWidth="6"
                      className="text-white/10"
                      fill="transparent"
                    />
                    <circle
                      cx="88"
                      cy="88"
                      r="76"
                      stroke="currentColor"
                      strokeWidth="6"
                      strokeDasharray={2 * Math.PI * 76}
                      strokeDashoffset={
                        2 * Math.PI * 76 * (1 - (totalSeconds > 0 ? remainingSeconds / totalSeconds : 0))
                      }
                      strokeLinecap="round"
                      className="text-primary transition-all duration-1000 ease-linear shadow-[0_0_20px_rgba(168,85,247,0.5)]"
                      fill="transparent"
                    />
                  </svg>

                  <div className="absolute flex flex-col items-center">
                    <span className="text-3xl font-black text-white font-mono tracking-wider">
                      {formatTime(remainingSeconds)}
                    </span>
                    <span className="text-[11px] font-medium text-zinc-400 mt-0.5">
                      {mode === 'end-of-song' ? 'End of song' : 'remaining'}
                    </span>
                    {isFadingOut && (
                      <span className="text-[10px] font-bold text-amber-300 mt-1 animate-pulse flex items-center gap-1">
                        <Volume2 className="w-3 h-3" /> Fading out...
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Extend Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => addTime(5)}
                    className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-semibold text-white transition-all hover:scale-105 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" /> 5 min
                  </button>
                  <button
                    onClick={() => addTime(15)}
                    className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-semibold text-white transition-all hover:scale-105 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" /> 15 min
                  </button>
                  <button
                    onClick={cancelTimer}
                    className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-xs font-semibold text-rose-300 transition-all hover:scale-105 active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Cancel
                  </button>
                </div>

                <p className="text-[11px] text-zinc-400">
                  Audio gently ramps down to zero in the last 15 seconds to prevent jarring awakenings.
                </p>
              </div>
            ) : (
              /* Inactive: Select Timer Duration */
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2.5">
                  {[15, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => startTimer(mins)}
                      className="p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-left transition-all hover:scale-[1.02] active:scale-[0.98] group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base font-bold text-white group-hover:text-primary transition-colors">
                          {mins} mins
                        </span>
                        <Clock className="w-4 h-4 text-zinc-500 group-hover:text-primary transition-colors" />
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        Turn off in {mins} minutes
                      </p>
                    </button>
                  ))}
                </div>

                {/* End of Current Song Option */}
                {currentTrack && remainingSongSec > 5 && (
                  <button
                    onClick={() => startEndOfSongTimer(remainingSongSec)}
                    className="w-full p-3.5 rounded-2xl bg-primary/10 hover:bg-primary/15 border border-primary/30 flex items-center justify-between text-left transition-all hover:scale-[1.01] active:scale-[0.99] group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-primary/20 text-primary">
                        <Music className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-white group-hover:text-purple-200 transition-colors">
                          End of Current Song
                        </span>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          {currentTrack.title} ({formatTime(remainingSongSec)} left)
                        </p>
                      </div>
                    </div>
                  </button>
                )}

                {/* Custom Minutes Input */}
                <form onSubmit={handleStartCustom} className="pt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="480"
                    placeholder="Custom minutes..."
                    value={customMins}
                    onChange={(e) => setCustomMins(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-2xl bg-white/[0.05] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-primary transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!customMins || parseInt(customMins, 10) <= 0}
                    className="px-5 py-2.5 rounded-2xl bg-primary text-black font-bold text-xs hover:bg-purple-300 transition-all disabled:opacity-40 disabled:hover:scale-100 hover:scale-105 active:scale-95 shadow-md"
                  >
                    Start
                  </button>
                </form>

                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-[11px] text-zinc-400 flex items-center gap-2">
                  <Moon className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>
                    When the timer ends, music will smoothly fade out over 15 seconds.
                  </span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
