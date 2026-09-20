'use client';

import React, { useRef, useState, useCallback, useId, useEffect } from 'react';
import { useAudioStateStore } from '@/hooks/useAudioPlayer';

interface ZigzagProgressBarProps {
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

function getZigzagPoints(width = 1000, height = 20, step = 7, top = 4, bottom = 16): [number, number][] {
  const points: [number, number][] = [[0, height / 2]];
  let x = 0;
  let isTop = true;
  while (x < width) {
    x += step;
    const clampedX = Math.min(x, width);
    const y = isTop ? top : bottom;
    points.push([clampedX, y]);
    isTop = !isTop;
  }
  return points;
}

const STATIC_ZIGZAG_PATH = generateZigzagPath(1000, 20, 7, 4, 16);
const ZIGZAG_POINTS = getZigzagPoints(1000, 20, 7, 4, 16);

// Calculates the exact y percentage on the zigzag path for any progress percentage [0, 100]
function getExactZigzagYPercent(progressPercent: number): number {
  const targetX = Math.max(0, Math.min(1000, (progressPercent / 100) * 1000));
  let low = 0;
  let high = ZIGZAG_POINTS.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (ZIGZAG_POINTS[mid][0] < targetX) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  const p0 = ZIGZAG_POINTS[Math.max(0, high)];
  const p1 = ZIGZAG_POINTS[Math.min(ZIGZAG_POINTS.length - 1, low)];
  if (!p0 || !p1 || p0 === p1 || p1[0] === p0[0]) {
    return p0 ? (p0[1] / 20) * 100 : 50;
  }
  const t = (targetX - p0[0]) / (p1[0] - p0[0]);
  const y = p0[1] + t * (p1[1] - p0[1]);
  return (y / 20) * 100;
}

export const ZigzagProgressBar: React.FC<ZigzagProgressBarProps> = ({
  onSeek,
  isPlaying = false,
  className = '',
}) => {
  const currentTime = useAudioStateStore((s) => s.currentTime);
  const duration = useAudioStateStore((s) => s.duration);
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

          {/* 4. Sleek Precision Playhead Bead (Accurately rides the zigzag waveform line) */}
          <div
            className="absolute pointer-events-none z-20 transition-[transform] duration-75"
            style={{
              left: `${displayProgress}%`,
              top: `${getExactZigzagYPercent(displayProgress)}%`,
              transform: `translate(-50%, -50%) scale(${isDragging ? 1.25 : 1})`,
            }}
          >
            <div className="w-1.5 h-1.5 rotate-45 rounded-[1px] bg-white border border-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.95)] transition-all group-hover:scale-125" />
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
