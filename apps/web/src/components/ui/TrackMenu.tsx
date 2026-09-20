'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  MoreVertical,
  CornerDownRight,
  ListPlus,
  Heart,
  Plus,
  Trash2,
  Sliders,
  Moon,
} from 'lucide-react';
import { usePlayerStore, Track } from '@/store/usePlayerStore';
import { useFavorites, useAddFavorite, useRemoveFavorite } from '@/hooks/queries';
import { useUIStore } from '@/store/useUIStore';
import { useEqualizerStore } from '@/store/useEqualizerStore';
import { useSleepTimerStore } from '@/store/useSleepTimerStore';
import { toast } from 'sonner';

interface TrackMenuProps {
  track: Track;
  className?: string;
  triggerClassName?: string;
  onRemoveFromPlaylist?: () => void;
}

export const TrackMenu: React.FC<TrackMenuProps> = ({
  track,
  className = '',
  triggerClassName = '',
  onRemoveFromPlaylist,
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
        className={`p-1.5 rounded-full liquid-glass-pill text-white/80 hover:text-white transition-all duration-200 active:scale-95 ${triggerClassName}`}
        title="More options"
        aria-label="More options"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {/* Floating Liquid Glass Dropdown Menu in Portal (Always above cards) */}
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
              WebkitBackdropFilter: 'blur(32px) saturate(160%)',
              backdropFilter: 'blur(32px) saturate(160%)',
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-52 rounded-2xl liquid-glass-dropdown py-1.5 z-[9999] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85)] border border-white/20 animate-in fade-in zoom-in-95 duration-150 select-none transform-gpu will-change-transform"
          >
            {/* Apple iOS Deep Blurred Album Art inside Dropdown */}
            {track?.albumArt && (
              <div className="absolute -inset-10 overflow-hidden pointer-events-none -z-10">
                <div
                  className="absolute -inset-10 bg-cover bg-center filter blur-[35px] opacity-75 scale-130 transition-all duration-500"
                  style={{ backgroundImage: `url(${track.albumArt})` }}
                />
                <div className="absolute inset-0 bg-black/45" />
              </div>
            )}

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

            <div className="my-1 border-t border-white/10" />

            {/* Equalizer & Audio FX */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                useEqualizerStore.getState().setIsModalOpen(true);
                setIsOpen(false);
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition-colors text-left"
            >
              <Sliders className="w-3.5 h-3.5 text-zinc-400" />
              <span>Equalizer & FX</span>
            </button>

            {/* Sleep Timer */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                useSleepTimerStore.getState().setIsModalOpen(true);
                setIsOpen(false);
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition-colors text-left"
            >
              <Moon className="w-3.5 h-3.5 text-zinc-400" />
              <span>Sleep Timer</span>
            </button>

            {/* Remove from this Playlist */}
            {onRemoveFromPlaylist && (
              <>
                <div className="my-1 border-t border-white/10" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFromPlaylist();
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left group"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400 group-hover:scale-110 transition-transform" />
                  <span>Remove from playlist</span>
                </button>
              </>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};
