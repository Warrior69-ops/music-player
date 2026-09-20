'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAudioStateStore, useAudioPlayer } from '@/hooks/useAudioPlayer';

function formatDuration(seconds?: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function NowPlayingProgressBar({ isExiting }: { isExiting: boolean }) {
  const currentTime = useAudioStateStore((s) => s.currentTime);
  const duration = useAudioStateStore((s) => s.duration);
  const { seek } = useAudioPlayer();

  const [isHoveringSeek, setIsHoveringSeek] = useState(false);
  const [hoverSeekPercent, setHoverSeekPercent] = useState<number | null>(null);

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seek(ratio * duration);
  };

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverSeekPercent(ratio * 100);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scaleX: 0.88 }}
      animate={isExiting ? { opacity: 0, y: 60, scaleX: 0.85 } : { opacity: 1, y: 0, scaleX: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 25, delay: isExiting ? 0 : 0.18 }}
      className="w-full max-w-[500px] mx-auto mt-4 px-2"
    >
      <div
        onClick={handleProgressClick}
        onMouseMove={handleProgressMouseMove}
        onMouseEnter={() => setIsHoveringSeek(true)}
        onMouseLeave={() => {
          setIsHoveringSeek(false);
          setHoverSeekPercent(null);
        }}
        className="group relative h-2 bg-white/10 hover:bg-white/15 rounded-full cursor-pointer transition-all overflow-hidden flex items-center shadow-inner"
      >
        {/* Played Progress Bar with Glow */}
        <div
          className="h-full bg-gradient-to-r from-purple-500 via-primary to-fuchsia-400 rounded-full relative transition-all duration-100 shadow-[0_0_12px_rgba(168,85,247,0.7)]"
          style={{ width: `${progressPercent}%` }}
        />

        {/* Hover ghost indicator */}
        {isHoveringSeek && hoverSeekPercent !== null && (
          <div
            className="absolute top-0 bottom-0 bg-white/20 pointer-events-none rounded-full"
            style={{ width: `${hoverSeekPercent}%` }}
          />
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-400 font-mono mt-1.5 px-0.5">
        <span>{formatDuration(currentTime)}</span>
        <span>{formatDuration(duration)}</span>
      </div>
    </motion.div>
  );
}
