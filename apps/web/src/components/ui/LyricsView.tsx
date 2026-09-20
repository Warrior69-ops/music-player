'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LyricLine, WordSync, LyricsPayload } from '@/types/lyrics';
import { useAudioStateStore } from '@/hooks/useAudioPlayer';

interface LyricsViewProps {
  lyricsData: LyricsPayload;
  isPlaying?: boolean;
  onSeek?: (timestampInSeconds: number) => void;
}

export const LyricsView: React.FC<LyricsViewProps> = ({
  lyricsData,
  isPlaying = false,
  onSeek,
}) => {
  const currentTime = useAudioStateStore((s) => s.currentTime);
  const { lyrics, isWordSynced, isLineSynced } = lyricsData;

  // High-frequency interpolated clock for 60fps word-by-word progressive glow
  const [smoothTime, setSmoothTime] = useState<number>(currentTime);
  const currentTimeRef = useRef<number>(currentTime);

  useEffect(() => {
    currentTimeRef.current = currentTime;
    setSmoothTime(currentTime);
  }, [currentTime]);

  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrolledIdxRef = useRef<number>(-1);

  // Smooth animation frame loop
  useEffect(() => {
    let animId: number;
    let lastTick = performance.now();
    let localClock = currentTimeRef.current;

    const frame = (now: number) => {
      const dt = (now - lastTick) / 1000;
      lastTick = now;

      if (isPlaying) {
        localClock += dt;
        const drift = currentTimeRef.current - localClock;
        if (Math.abs(drift) > 0.3) {
          // Hard snap if significant seek or drift
          localClock = currentTimeRef.current;
        } else {
          // Gentle catch-up
          localClock += drift * 0.15;
        }
      } else {
        localClock = currentTimeRef.current;
      }

      setSmoothTime(localClock);
      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  // Derived active line index from current playback clock
  const activeLineIdx = useMemo(() => {
    if (!isLineSynced || !lyrics || lyrics.length === 0) return -1;
    return lyrics.findIndex(
      (line) => smoothTime >= line.start && smoothTime < line.end
    );
  }, [smoothTime, lyrics, isLineSynced]);

  // Smoothly center active line in view when active line changes
  useEffect(() => {
    if (activeLineIdx !== -1 && activeLineIdx !== lastScrolledIdxRef.current) {
      lastScrolledIdxRef.current = activeLineIdx;
      lineRefs.current[activeLineIdx]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeLineIdx]);

  if (!lyrics || lyrics.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground font-medium">
        No lyrics available for this track
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-y-auto px-6 py-28 space-y-9 scrollbar-none select-none"
    >
      {lyrics.map((line, lIdx) => {
        const isLineActive = lIdx === activeLineIdx;
        const isLinePassed = lIdx < activeLineIdx;

        return (
          <div
            key={lIdx}
            ref={(el) => {
              lineRefs.current[lIdx] = el;
            }}
            onClick={() => onSeek && isLineSynced && onSeek(line.start)}
            className={`cursor-pointer transition-all duration-300 transform origin-left font-bold tracking-tight text-2xl md:text-3xl lg:text-4xl ${
              isLineActive
                ? 'scale-105 opacity-100 blur-0'
                : isLinePassed
                ? 'opacity-30 blur-[0.4px] hover:opacity-50'
                : 'opacity-25 hover:opacity-60'
            }`}
          >
            {/* Word-by-word progressive rendering */}
            {isWordSynced && line.words && line.words.length > 0 ? (
              <span className="inline-flex flex-wrap gap-x-2">
                {line.words.map((wordObj, wIdx) => {
                  const isWordActive =
                    smoothTime >= wordObj.start && smoothTime < wordObj.end;
                  const isWordPassed = smoothTime >= wordObj.end;

                  return (
                    <span
                      key={wIdx}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSeek && onSeek(wordObj.start);
                      }}
                      className={`relative transition-all duration-150 inline-block cursor-pointer ${
                        isWordActive
                          ? 'text-white font-extrabold drop-shadow-[0_0_16px_rgba(168,85,247,0.9)] scale-105'
                          : isWordPassed
                          ? 'text-white'
                          : isLineActive
                          ? 'text-white/40'
                          : 'text-zinc-500'
                      }`}
                    >
                      {wordObj.word}
                    </span>
                  );
                })}
              </span>
            ) : (
              /* Fallback to line-synced highlighting */
              <span className={isLineActive ? 'text-white drop-shadow-[0_0_12px_rgba(168,85,247,0.7)]' : 'text-zinc-500'}>
                {line.text}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
