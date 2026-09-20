'use client';

import React, { useRef, useState, useCallback, useId } from 'react';

interface ZigzagProgressBarProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  isPlaying?: boolean;
  className?: string;
}

function formatTime(seconds: number) {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Generates an elegant, refined zigzag waveform SVG path
function generateZigzagPath(width = 1000, height = 20, step = 7, top = 4, bottom = 16) {
  let path = `M 0 ${height / 2}`;
  let x = 0;
  let isTop = true;
  while (x < width) {
    x += step;
    const clampedX = Math.min(x, width);
    const y = isTop ? top : bottom;
    path += ` L ${clampedX} ${y}`;
    isTop = !isTop;
  }
  return path;
}

const STATIC_ZIGZAG_PATH = generateZigzagPath(1000, 20, 7, 4, 16);

export const ZigzagProgressBar: React.FC<ZigzagProgressBarProps> = ({
  currentTime,
  duration,
  onSeek,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ xPercent: number; time: number } | null>(null);
  const uniqueId = useId().replace(/:/g, '');

  const actualProgress = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
  const displayProgress = isDragging && dragProgress !== null ? dragProgress : actualProgress;

  const calculateProgressFromEvent = useCallback(
    (clientX: number) => {
      if (!containerRef.current || duration <= 0) return { percent: 0, time: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percent = Math.min(100, Math.max(0, (clickX / rect.width) * 100));
      const time = (percent / 100) * duration;
      return { percent, time };
    },
    [duration]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setIsDragging(true);
    const { percent, time } = calculateProgressFromEvent(e.clientX);
    setDragProgress(percent);
    onSeek(time);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    const { percent, time } = calculateProgressFromEvent(e.clientX);

    if (isDragging) {
      setDragProgress(percent);
      onSeek(time);
    } else {
      setHoverPosition({ xPercent: percent, time });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      setIsDragging(false);
      if (dragProgress !== null && duration > 0) {
        onSeek((dragProgress / 100) * duration);
      }
      setDragProgress(null);
    }
  };

  const handlePointerLeave = () => {
    if (!isDragging) {
      setHoverPosition(null);
    }
  };

  return (
    <div className={`w-full flex items-center gap-3 select-none ${className}`}>
      {/* Current Time */}
      <span className="text-[11px] font-mono font-medium text-zinc-400 w-9 text-right tracking-tight shrink-0">
        {formatTime(isDragging && dragProgress !== null ? (dragProgress / 100) * duration : currentTime)}
      </span>

      {/* Interactive Zigzag Waveform Track Container */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        className="relative flex-1 h-6 flex items-center cursor-pointer group py-1"
        role="slider"
        aria-label="Seek track"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
      >
        {/* SVG Zigzag Waveform */}
        <div className="w-full h-full relative overflow-visible">
          <svg
            viewBox="0 0 1000 20"
            preserveAspectRatio="none"
            className="w-full h-full overflow-visible"
          >
            <defs>
              {/* Dynamic Purple Harmonic Gradient across progress */}
              <linearGradient id={`zigzag-grad-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>

              {/* Progress Clipping Rectangle */}
              <clipPath id={`zigzag-clip-${uniqueId}`}>
                <rect
                  x="0"
                  y="0"
                  width={`${displayProgress * 10}`}
                  height="20"
                  className="transition-[width] duration-75 ease-linear"
                />
              </clipPath>

              {/* Hover Position Clipping Rectangle */}
              {hoverPosition && (
                <clipPath id={`zigzag-hover-clip-${uniqueId}`}>
                  <rect
                    x="0"
                    y="0"
                    width={`${hoverPosition.xPercent * 10}`}
                    height="20"
                  />
                </clipPath>
              )}
            </defs>

            {/* 1. Inactive/Background Zigzag Path */}
            <path
              d={STATIC_ZIGZAG_PATH}
              fill="none"
              stroke="rgba(255, 255, 255, 0.14)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="group-hover:stroke-white/25 transition-colors duration-200"
            />

            {/* 2. Hover Scrub Ghost Path */}
            {hoverPosition && (
              <path
                d={STATIC_ZIGZAG_PATH}
                fill="none"
                stroke="rgba(168, 85, 247, 0.3)"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                clipPath={`url(#zigzag-hover-clip-${uniqueId})`}
              />
            )}

            {/* 3. Active Filled Zigzag Path */}
            <path
              d={STATIC_ZIGZAG_PATH}
              fill="none"
              stroke={`url(#zigzag-grad-${uniqueId})`}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              clipPath={`url(#zigzag-clip-${uniqueId})`}
            />
          </svg>

          {/* 4. Sleek Diamond Playhead Bead */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none transition-transform duration-150 z-20"
            style={{
              left: `${displayProgress}%`,
              transform: `translate(-50%, -50%) scale(${isDragging ? 1.25 : 1})`,
            }}
          >
            <div className="w-2.5 h-2.5 rotate-45 rounded-[1.5px] bg-white border border-purple-400 shadow-sm transition-all group-hover:scale-125" />
          </div>

          {/* 5. Hover Timestamp Tooltip */}
          {hoverPosition && !isDragging && (
            <div
              className="absolute -top-7 -translate-x-1/2 pointer-events-none px-2 py-0.5 rounded-md bg-zinc-900/95 border border-white/10 text-[10px] font-mono text-zinc-300 shadow-lg backdrop-blur-md z-30 transition-all"
              style={{ left: `${hoverPosition.xPercent}%` }}
            >
              {formatTime(hoverPosition.time)}
            </div>
          )}
        </div>
      </div>

      {/* Total Duration */}
      <span className="text-[11px] font-mono font-medium text-zinc-400 w-9 text-left tracking-tight shrink-0">
        {formatTime(duration)}
      </span>
    </div>
  );
};
