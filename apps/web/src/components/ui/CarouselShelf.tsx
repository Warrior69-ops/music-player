'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

interface CarouselShelfProps {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  hasEndArrowCard?: boolean;
  endCardTitle?: string;
  endCardSubtitle?: string;
  onEndCardClick?: () => void;
  className?: string;
}

export function CarouselShelf({
  title,
  icon,
  action,
  children,
  hasEndArrowCard = true,
  endCardTitle = 'See More',
  endCardSubtitle = 'Explore shelf',
  onEndCardClick,
  className = '',
}: CarouselShelfProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollState = useCallback(() => {
    if (rafIdRef.current) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      const el = scrollRef.current;
      if (!el) return;
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setCanScrollLeft(scrollLeft > 20);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 25);
    });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScrollState();
    el.addEventListener('scroll', checkScrollState, { passive: true });
    window.addEventListener('resize', checkScrollState);
    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      el.removeEventListener('scroll', checkScrollState);
      window.removeEventListener('resize', checkScrollState);
    };
  }, [checkScrollState]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = Math.max(300, Math.floor(el.clientWidth * 0.75));
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const handleEndCardClick = () => {
    if (onEndCardClick) {
      onEndCardClick();
    } else {
      scroll('right');
    }
  };

  return (
    <section className={`space-y-4 ${className}`}>
      {/* ── Shelf Header with Controls ─────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {icon}
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {action}

          {/* Carousel Arrow Controls in Shelf Header */}
          <div className="flex items-center gap-1 bg-white/[0.07] border border-white/12 rounded-full p-1 backdrop-blur-md shadow-sm">
            <button
              type="button"
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              aria-label={`Scroll ${title} left`}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
                canScrollLeft
                  ? 'text-white hover:bg-white/20 active:scale-90 cursor-pointer shadow-sm'
                  : 'text-zinc-600 cursor-not-allowed opacity-35'
              }`}
              title="Previous items"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              aria-label={`Scroll ${title} right`}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
                canScrollRight
                  ? 'text-white hover:bg-white/20 active:scale-90 cursor-pointer shadow-sm'
                  : 'text-zinc-600 cursor-not-allowed opacity-35'
              }`}
              title="Next items"
            >
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Horizontal Scrolling Rail with Floating Edge Arrows ─────── */}
      <div className="relative group/rail">
        {/* Left Floating Edge Arrow */}
        <button
          type="button"
          onClick={() => scroll('left')}
          aria-label={`Scroll ${title} left`}
          className={`absolute left-2 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/75 hover:bg-purple-600/90 text-white border border-white/20 shadow-[0_8px_30px_rgba(0,0,0,0.8)] backdrop-blur-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer ${
            canScrollLeft
              ? 'opacity-0 group-hover/rail:opacity-100 pointer-events-auto'
              : 'opacity-0 pointer-events-none'
          }`}
        >
          <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Scrollable Container (Clean, no dirty browser scrollbar slider) */}
        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-4 pt-1 no-scrollbar scroll-smooth"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {children}

          {/* End Carousel Arrow Card (Carousel Type Arrow at Line End) */}
          {hasEndArrowCard && (
            <div className="w-[180px] sm:w-[210px] flex-shrink-0 snap-start">
              <div
                onClick={handleEndCardClick}
                className="group/endcard aspect-square w-full rounded-2xl bg-white/[0.03] hover:bg-purple-950/25 border border-white/10 hover:border-purple-400/40 shadow-lg hover:shadow-[0_8px_30px_rgba(139,92,246,0.2)] flex flex-col items-center justify-center text-center p-4 cursor-pointer transition-all duration-300 select-none"
              >
                <div className="w-12 h-12 rounded-full bg-white/[0.04] group-hover/endcard:bg-purple-500/20 border border-white/15 group-hover/endcard:border-purple-400/50 flex items-center justify-center mb-3 shadow-md transition-all duration-300">
                  <ArrowRight className="w-5 h-5 text-purple-300 group-hover/endcard:text-white transition-colors duration-300" />
                </div>
                <span className="text-sm font-bold text-white group-hover/endcard:text-purple-200 transition-colors">
                  {endCardTitle}
                </span>
                <span className="text-[11px] text-purple-300/70 mt-0.5">
                  {endCardSubtitle}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Floating Edge Arrow */}
        <button
          type="button"
          onClick={() => scroll('right')}
          aria-label={`Scroll ${title} right`}
          className={`absolute right-2 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-black/75 hover:bg-purple-600/90 text-white border border-white/20 shadow-[0_8px_30px_rgba(0,0,0,0.8)] backdrop-blur-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer ${
            canScrollRight
              ? 'opacity-0 group-hover/rail:opacity-100 pointer-events-auto'
              : 'opacity-0 pointer-events-none'
          }`}
        >
          <ChevronRight className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>
    </section>
  );
}
