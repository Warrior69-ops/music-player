'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Play, Shuffle, Download, DownloadCloud } from 'lucide-react';
import { usePlayerStore, Track } from '@/store/usePlayerStore';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { smartShuffleTracks } from '@/lib/smartShuffle';
import { toast } from 'sonner';

interface PlaylistMenuProps {
  tracks: Track[];
  playlistName: string;
  playlistId: string;
  type: 'playlist' | 'favorites';
  className?: string;
  triggerClassName?: string;
}

export const PlaylistMenu: React.FC<PlaylistMenuProps> = ({
  tracks,
  playlistName,
  playlistId,
  type,
  className = '',
  triggerClassName = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { setQueue } = usePlayerStore();
  const { isDownloaded, isDownloading, downloadTrack, removeTrack } = useOfflineSync();

  const updateCoords = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 192; // 12rem
    const menuHeight = 160;

    let top = rect.bottom + 6;
    if (top + menuHeight > window.innerHeight && rect.top - menuHeight > 0) {
      top = rect.top - menuHeight - 6;
    }

    let left = rect.right - menuWidth;
    if (left < 8) left = 8;
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8;
    }

    setCoords({ top, left });
  };

  useEffect(() => {
    if (!isOpen) return;
    updateCoords();

    const handleScroll = (e: Event) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
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
      if (e.key === 'Escape') setIsOpen(false);
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

  // Download logic
  // A playlist is considered downloaded if at least 80% of its tracks are downloaded
  const downloadedCount = tracks.filter((t) => isDownloaded(t.providerTrackId || t.id || '')).length;
  const downloadingCount = tracks.filter((t) => isDownloading(t.providerTrackId || t.id || '')).length;
  const isFullyDownloaded = tracks.length > 0 && downloadedCount >= tracks.length;
  const isPartiallyDownloaded = downloadedCount > 0 && downloadedCount < tracks.length;
  const isCurrentlyDownloading = downloadingCount > 0;

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (tracks.length === 0) {
      toast.error('Playlist is empty');
      return;
    }
    setQueue(tracks, 0, { type: type === 'favorites' ? 'favorites' : 'playlist', name: playlistName, id: playlistId });
    setIsOpen(false);
  };

  const handleShuffle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (tracks.length === 0) {
      toast.error('Playlist is empty');
      return;
    }
    const shuffled = smartShuffleTracks(tracks);
    setQueue(shuffled, 0, { type: type === 'favorites' ? 'favorites' : 'playlist', name: playlistName, id: playlistId });
    toast.success('Smart Shuffle enabled');
    setIsOpen(false);
  };

  const handleToggleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen(false);

    if (tracks.length === 0) {
      toast.error('Playlist is empty');
      return;
    }

    if (isFullyDownloaded) {
      // Remove all
      let removed = 0;
      for (const track of tracks) {
        const id = track.providerTrackId || track.id;
        if (id && isDownloaded(id)) {
          await removeTrack(id);
          removed++;
        }
      }
      toast.success(`Removed ${removed} tracks from offline storage`);
    } else {
      // Download missing
      toast.success(`Starting download for ${tracks.length - downloadedCount} tracks...`);
      for (const track of tracks) {
        const id = track.providerTrackId || track.id;
        if (id && !isDownloaded(id) && !isDownloading(id)) {
          // Fire and forget (it handles its own queue)
          downloadTrack(track).catch(console.error);
        }
      }
    }
  };

  return (
    <div className={`relative inline-block text-left ${className}`} onClick={(e) => e.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`p-1.5 rounded-full bg-black/40 text-white/80 hover:text-white hover:bg-black/60 transition-all duration-200 active:scale-95 z-10 backdrop-blur-md ${triggerClassName}`}
        aria-label="Playlist options"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

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
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            className="w-52 rounded-2xl liquid-glass-dropdown py-1.5 z-[9999] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85)] border border-white/20 animate-in fade-in zoom-in-95 duration-150 select-none transform-gpu"
          >
            <div className="absolute inset-0 bg-black/45 -z-10" />

            {/* Play */}
            <button
              onClick={handlePlay}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition-colors text-left"
            >
              <Play className="w-3.5 h-3.5 text-primary fill-primary" />
              <span>Play</span>
            </button>

            {/* Shuffle */}
            <button
              onClick={handleShuffle}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition-colors text-left"
            >
              <Shuffle className="w-3.5 h-3.5 text-zinc-400" />
              <span>Shuffle Play</span>
            </button>

            <div className="my-1 border-t border-white/10" />

            {/* Download */}
            <button
              onClick={handleToggleDownload}
              disabled={isCurrentlyDownloading && !isFullyDownloaded}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10 transition-colors text-left disabled:opacity-50"
            >
              {isFullyDownloaded ? (
                <>
                  <DownloadCloud className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-cyan-400">Remove Download</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-zinc-400" />
                  <span>
                    {isCurrentlyDownloading 
                      ? `Downloading (${downloadingCount})...` 
                      : isPartiallyDownloaded 
                        ? 'Download Missing Tracks' 
                        : 'Download Playlist'}
                  </span>
                </>
              )}
            </button>
          </div>,
          document.body
        )}
    </div>
  );
};
