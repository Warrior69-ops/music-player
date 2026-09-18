'use client';

import React, { useEffect, useRef } from 'react';
import {
  X,
  Shuffle,
  Infinity as InfinityIcon,
  Trash2,
  Play,
  Music2,
  ListMusic,
  CornerDownRight,
  Radio,
} from 'lucide-react';
import { usePlayerStore, getTrackId, Track } from '@/store/usePlayerStore';

function formatDuration(seconds?: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const QueueDrawer: React.FC = () => {
  const {
    queue,
    currentIndex,
    currentTrack,
    isPlaying,
    isShuffle,
    isAutoplayEnabled,
    isQueueOpen,
    setIsQueueOpen,
    toggleShuffle,
    toggleAutoplay,
    jumpToIndex,
    removeFromQueue,
    clearQueue,
    playNext,
  } = usePlayerStore();

  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isQueueOpen) {
        setIsQueueOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQueueOpen, setIsQueueOpen]);

  if (!isQueueOpen) return null;

  // Segregate upcoming queue into User Queue and Autoplay
  const upcomingWithIndex = queue
    .map((track, idx) => ({ track, actualIndex: idx }))
    .slice(currentIndex + 1);

  const userQueueItems = upcomingWithIndex.filter(({ track }) => !track.isAutoplay);
  const autoplayItems = upcomingWithIndex.filter(({ track }) => !!track.isAutoplay);

  const renderTrackItem = (track: Track, actualIndex: number, displayIndex?: number) => {
    return (
      <div
        key={`${getTrackId(track)}-${actualIndex}`}
        className="group flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.06] transition-colors border border-transparent hover:border-white/5 cursor-pointer"
        onClick={() => jumpToIndex(actualIndex)}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {displayIndex !== undefined ? (
            <>
              <div className="w-5 text-center text-xs text-muted-foreground group-hover:hidden font-mono">
                {displayIndex}
              </div>
              <div className="w-5 text-center hidden group-hover:flex items-center justify-center text-white">
                <Play className="w-3.5 h-3.5 fill-white" />
              </div>
            </>
          ) : (
            <div className="w-5 text-center flex items-center justify-center text-muted-foreground group-hover:text-white">
              <Play className="w-3.5 h-3.5 group-hover:fill-current opacity-70 group-hover:opacity-100" />
            </div>
          )}

          {/* Thumbnail */}
          {track.albumArt ? (
            <img
              src={track.albumArt}
              alt={track.title}
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
              <Music2 className="w-4 h-4 text-white/30" />
            </div>
          )}

          {/* Title & Artist */}
          <div className="min-w-0 flex-1">
            <h5 className="text-xs font-semibold text-white truncate group-hover:text-primary transition-colors">
              {track.title}
            </h5>
            <p className="text-[11px] text-zinc-400 truncate">{track.artist}</p>
          </div>
        </div>

        {/* Right actions: Duration, Play Next, Remove */}
        <div className="flex items-center gap-1.5 ml-2">
          <span className="text-xs text-muted-foreground group-hover:hidden">
            {formatDuration(track.duration)}
          </span>

          <div className="hidden group-hover:flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                playNext(track);
              }}
              className="p-1.5 rounded-md hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
              title="Play Immediately Next"
            >
              <CornerDownRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeFromQueue(actualIndex);
              }}
              className="p-1.5 rounded-md hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400 transition-colors"
              title="Remove from Queue"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={() => setIsQueueOpen(false)}
      />

      {/* Drawer Container */}
      <aside
        ref={drawerRef}
        aria-label="Playback Queue"
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-zinc-950/90 backdrop-blur-2xl border-l border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col animate-in slide-in-from-right duration-300 select-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <ListMusic className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-white tracking-tight">Play Queue</h2>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-white/10 text-white/70">
              {queue.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Shuffle Button */}
            <button
              onClick={toggleShuffle}
              className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 ${
                isShuffle
                  ? 'text-primary bg-primary/20 shadow-[0_0_12px_rgba(168,85,247,0.4)] ring-1 ring-primary/40'
                  : 'text-muted-foreground hover:text-white hover:bg-white/5'
              }`}
              title={isShuffle ? 'Shuffle is ON (Click to turn OFF)' : 'Shuffle is OFF (Click to turn ON)'}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            {/* Autoplay Button */}
            <button
              onClick={toggleAutoplay}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95 ${
                isAutoplayEnabled
                  ? 'text-cyan-400 bg-cyan-500/15 shadow-[0_0_12px_rgba(6,182,212,0.3)] ring-1 ring-cyan-500/30'
                  : 'text-muted-foreground hover:text-white hover:bg-white/5'
              }`}
              title={isAutoplayEnabled ? 'Infinite Autoplay is ON' : 'Infinite Autoplay is OFF'}
            >
              <InfinityIcon className="w-4 h-4" />
              <span>Autoplay</span>
            </button>

            {/* Clear Queue Button */}
            {(userQueueItems.length > 0 || autoplayItems.length > 0) && (
              <button
                onClick={clearQueue}
                className="p-2 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Clear upcoming queue"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={() => setIsQueueOpen(false)}
              className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-colors ml-1"
              title="Close Queue (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
          {/* SECTION 1: NOW PLAYING */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Now Playing
            </div>
            {currentTrack ? (
              <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/[0.07] border border-primary/30 shadow-[0_0_20px_rgba(168,85,247,0.15)] relative overflow-hidden group">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />

                {currentTrack.albumArt ? (
                  <img
                    src={currentTrack.albumArt}
                    alt={currentTrack.title}
                    className="w-14 h-14 rounded-xl object-cover shadow-md flex-shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Music2 className="w-6 h-6 text-white/30" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">
                    {currentTrack.title}
                  </h4>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">{currentTrack.artist}</p>
                </div>

                <div className="flex items-center gap-2 pr-1">
                  {isPlaying ? (
                    <div className="flex items-end gap-0.5 h-4 w-4">
                      <span className="w-1 bg-primary rounded-full animate-bounce h-full" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 bg-primary rounded-full animate-bounce h-2/3" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 bg-primary rounded-full animate-bounce h-full" style={{ animationDelay: '300ms' }} />
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {formatDuration(currentTrack.duration)}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white/5 text-xs text-muted-foreground text-center">
                No track currently playing
              </div>
            )}
          </div>

          {/* SECTION 2: UP NEXT (USER-ADDED QUEUE) */}
          {userQueueItems.length > 0 && (
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                <span>Up Next ({userQueueItems.length})</span>
                {isShuffle && <span className="text-primary font-semibold">Shuffled</span>}
              </div>

              <div className="space-y-1.5">
                {userQueueItems.map(({ track, actualIndex }, relIdx) =>
                  renderTrackItem(track, actualIndex, relIdx + 1)
                )}
              </div>
            </div>
          )}

          {/* SECTION 3: AUTOPLAY (RECOMMENDED RADIO TRACKS) */}
          {autoplayItems.length > 0 && (
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                <div className="flex items-center gap-1.5 text-cyan-400">
                  <Radio className="w-3.5 h-3.5" />
                  <span>Autoplay ({autoplayItems.length})</span>
                </div>
                <span className="text-[10px] text-muted-foreground lowercase">similar to current</span>
              </div>

              <div className="space-y-1.5">
                {autoplayItems.map(({ track, actualIndex }) =>
                  renderTrackItem(track, actualIndex)
                )}
              </div>
            </div>
          )}

          {/* EMPTY QUEUE STATE */}
          {userQueueItems.length === 0 && autoplayItems.length === 0 && (
            <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/5 text-center flex flex-col items-center">
              <InfinityIcon className="w-8 h-8 text-cyan-400/50 mb-2" />
              <p className="text-xs font-medium text-white mb-1">Queue is running low</p>
              <p className="text-[11px] text-muted-foreground max-w-xs">
                {isAutoplayEnabled
                  ? 'Infinite Autoplay is active. Similar radio tracks will be automatically fetched for non-stop music!'
                  : 'Turn on Autoplay above to continuously fetch similar tracks.'}
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
