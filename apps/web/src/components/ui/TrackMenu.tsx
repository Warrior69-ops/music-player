'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  MoreVertical,
  CornerDownRight,
  ListPlus,
  Heart,
  Plus,
} from 'lucide-react';
import { usePlayerStore, Track } from '@/store/usePlayerStore';
import { useFavorites, useAddFavorite, useRemoveFavorite } from '@/hooks/queries';
import { useUIStore } from '@/store/useUIStore';
import { toast } from 'sonner';

interface TrackMenuProps {
  track: Track;
  className?: string;
  triggerClassName?: string;
}

export const TrackMenu: React.FC<TrackMenuProps> = ({
  track,
  className = '',
  triggerClassName = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { playNext, addToQueue } = usePlayerStore();
  const { data: favorites } = useFavorites();
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();
  const { openPlaylistModal } = useUIStore();

  const isFavorite = favorites?.some(
    (f) => f.providerTrackId === track.providerTrackId
  );

  const updateCoords = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 192; // 12rem / w-48
    const menuHeight = 180;

    let top = rect.bottom + 6;
    // If overflowing bottom of viewport, flip above trigger
    if (top + menuHeight > window.innerHeight && rect.top - menuHeight > 0) {
      top = rect.top - menuHeight - 6;
    }

    // Align right edge of menu with right edge of trigger button
    let left = rect.right - menuWidth;
    if (left < 8) left = 8;
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8;
    }

    setCoords({ top, left });
  };

  // Close when clicked outside, scrolled, or on Escape
  useEffect(() => {
    if (!isOpen) return;

    updateCoords();

    const handleScroll = (e: Event) => {
      // Don't close if scrolling inside the dropdown itself
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return;
      }
      setIsOpen(false);
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', updateCoords);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', updateCoords);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handlePlayNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    playNext(track);
    toast.success('Playing next');
    setIsOpen(false);
  };

  const handleAddToQueue = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToQueue(track);
    toast.success('Added to queue');
    setIsOpen(false);
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFavorite) {
      removeFavorite.mutate(track.providerTrackId, {
        onSuccess: () => toast.success('Removed from favorites'),
        onError: () => toast.error('Failed to remove favorite'),
      });
    } else {
      addFavorite.mutate(track, {
        onSuccess: () => toast.success('Added to favorites'),
        onError: () => toast.error('Failed to add favorite'),
      });
    }
    setIsOpen(false);
  };

  const handleAddToPlaylist = (e: React.MouseEvent) => {
    e.stopPropagation();
    openPlaylistModal(track);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block text-left ${className}`}>
      {/* 3-Dot Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`p-1.5 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md text-white/80 hover:text-white transition-all duration-200 border border-white/10 shadow-lg active:scale-95 ${triggerClassName}`}
        title="More options"
        aria-label="More options"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {/* Floating Glassmorphic Dropdown Menu in Portal (Always above cards) */}
      {isOpen &&
        coords &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-48 rounded-xl bg-zinc-900/95 backdrop-blur-2xl border border-white/15 shadow-[0_12px_45px_rgba(0,0,0,0.85)] py-1.5 z-[9999] animate-in fade-in zoom-in-95 duration-150 select-none"
          >
            {/* Play Next */}
            <button
              onClick={handlePlayNext}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition-colors text-left group"
            >
              <CornerDownRight className="w-3.5 h-3.5 text-primary group-hover:translate-x-0.5 transition-transform" />
              <span>Play Next</span>
            </button>

            {/* Add to Queue */}
            <button
              onClick={handleAddToQueue}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition-colors text-left"
            >
              <ListPlus className="w-3.5 h-3.5 text-zinc-400" />
              <span>Add to Queue</span>
            </button>

            <div className="my-1 border-t border-white/10" />

            {/* Add to / Remove from Favorites */}
            <button
              onClick={handleToggleFavorite}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition-colors text-left"
            >
              <Heart
                className={`w-3.5 h-3.5 ${
                  isFavorite ? 'text-primary fill-primary' : 'text-zinc-400'
                }`}
              />
              <span>{isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}</span>
            </button>

            {/* Add to Playlist */}
            <button
              onClick={handleAddToPlaylist}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition-colors text-left"
            >
              <Plus className="w-3.5 h-3.5 text-zinc-400" />
              <span>Add to Playlist</span>
            </button>
          </div>,
          document.body
        )}
    </div>
  );
};
