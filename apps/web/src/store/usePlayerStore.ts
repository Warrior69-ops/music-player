import { create } from 'zustand';

export interface Track {
  provider: string;
  providerTrackId: string;
  id?: string;
  title: string;
  artist: string;
  albumArt?: string;
  album?: string;
  albumId?: string;
  duration?: number;
  releaseDate?: Date;
  genre?: string;
  explicit?: boolean;
  streamUrl?: string;
  audioUrl?: string;
  previewUrl?: string;
  isStreamable?: boolean;
  isAutoplay?: boolean; // Track origin: true for background autoplay recommendations, false/undefined for user queue
}

export const getTrackId = (track?: Track | null): string => {
  if (!track) return '';
  return track.providerTrackId || track.id || '';
};

export interface QueueSource {
  type: 'album' | 'artist' | 'playlist' | 'favorites' | 'search' | 'radio' | 'custom';
  name: string;
  id?: string;
}

export interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  originalQueue: Track[]; // Preserved for toggling shuffle off
  currentIndex: number;
  isPlaying: boolean;
  volume: number;
  isShuffle: boolean;
  isAutoplayEnabled: boolean;
  isQueueOpen: boolean;
  isInstantLaunch: boolean;
  warmedTrackIds: string[];
  crossfadeDuration: number; // in seconds: 0 (off), 3, 5 (default), 7, 10
  queueSource: QueueSource | null;

  // Core Actions
  setCurrentTrack: (track: Track, source?: QueueSource | null) => void;
  setQueue: (tracks: Track[], startIndex?: number, source?: QueueSource | null) => void;
  setQueueSource: (source: QueueSource | null) => void;
  playNext: (track?: Track) => void; // Advances queue if no arg, inserts next if track passed
  addToQueue: (track: Track) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  playPrevious: () => void; // Backward compatibility
  jumpToIndex: (index: number) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  toggleShuffle: () => void;
  appendAutoplayTracks: (tracks: Track[]) => void;
  reorderQueue: (startIndex: number, endIndex: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  setCrossfadeDuration: (seconds: number) => void;
  toggleAutoplay: () => void;
  setIsQueueOpen: (open: boolean) => void;
  toggleQueue: () => void;
  setIsInstantLaunch: (isInstant: boolean) => void;
  addWarmedTrackId: (id: string) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  queue: [],
  originalQueue: [],
  currentIndex: -1,
  isPlaying: false,
  volume: 1,
  isShuffle: false,
  isAutoplayEnabled: true,
  isQueueOpen: false,
  isInstantLaunch: false,
  warmedTrackIds: [],
  crossfadeDuration: 5, // 5s Apple Music sweet spot default
  queueSource: null,

  setQueueSource: (source: QueueSource | null) => set({ queueSource: source }),

  setCurrentTrack: (track: Track, source?: QueueSource | null) => {
    const { queue, originalQueue } = get();
    const trackId = getTrackId(track);
    const existingIndex = queue.findIndex((t) => getTrackId(t) === trackId);

    const cleanTrack = { ...track, isAutoplay: false };

    const resolvedSource =
      source !== undefined
        ? source
        : track.album
        ? { type: 'album' as const, name: track.album, id: track.albumId }
        : track.artist
        ? { type: 'artist' as const, name: `${track.artist} Radio` }
        : { type: 'custom' as const, name: track.title };

    if (existingIndex !== -1) {
      set({
        currentTrack: cleanTrack,
        currentIndex: existingIndex,
        isPlaying: true,
        queueSource: resolvedSource,
      });
    } else {
      // If queue is empty or song is not in queue, set it as current track at index 0
      set({
        currentTrack: cleanTrack,
        queue: [cleanTrack, ...queue],
        originalQueue: [cleanTrack, ...originalQueue],
        currentIndex: 0,
        isPlaying: true,
        queueSource: resolvedSource,
      });
    }
  },

  setQueue: (tracks: Track[], startIndex = 0, source?: QueueSource | null) => {
    const validIndex = Math.max(0, Math.min(startIndex, tracks.length - 1));
    const cleanTracks = tracks.map((t) => ({ ...t, isAutoplay: false }));
    const targetTrack = cleanTracks[validIndex] || null;

    const resolvedSource =
      source !== undefined
        ? source
        : targetTrack?.album
        ? { type: 'album' as const, name: targetTrack.album, id: targetTrack.albumId }
        : targetTrack?.artist
        ? { type: 'artist' as const, name: targetTrack.artist }
        : null;

    set({
      queue: cleanTracks,
      originalQueue: cleanTracks,
      currentIndex: validIndex,
      currentTrack: targetTrack,
      isPlaying: true,
      isShuffle: false,
      queueSource: resolvedSource,
    });
  },

  playNext: (track?: Track) => {
    // 1. If called without args (e.g. from PlayerBar skip forward): Advance queue explicitly
    if (!track) {
      get().nextTrack();
      return;
    }

    // 2. If called with a track: Insert immediately after currentTrack as "Play Next"
    const { queue, originalQueue, currentIndex, currentTrack } = get();
    const cleanTrack = { ...track, isAutoplay: false };

    if (queue.length === 0 || !currentTrack) {
      set({
        queue: [cleanTrack],
        originalQueue: [cleanTrack],
        currentIndex: 0,
        currentTrack: cleanTrack,
        isPlaying: true,
      });
      return;
    }

    const newQueue = [...queue];
    const newOriginal = [...originalQueue];

    // Splice immediately after currentIndex
    const insertIndex = currentIndex + 1;
    newQueue.splice(insertIndex, 0, cleanTrack);
    newOriginal.splice(insertIndex, 0, cleanTrack);

    set({
      queue: newQueue,
      originalQueue: newOriginal,
    });
  },

  addToQueue: (track: Track) => {
    const { queue, originalQueue, currentIndex, currentTrack } = get();
    const cleanTrack = { ...track, isAutoplay: false };

    if (queue.length === 0 || !currentTrack) {
      set({
        queue: [cleanTrack],
        originalQueue: [cleanTrack],
        currentIndex: 0,
        currentTrack: cleanTrack,
        isPlaying: true,
      });
      return;
    }

    const newQueue = [...queue];
    const newOriginal = [...originalQueue];

    // Find the first autoplay track after currentIndex to insert right before autoplay begins
    const firstAutoplayIndex = newQueue.findIndex(
      (t, idx) => idx > currentIndex && t.isAutoplay === true
    );

    if (firstAutoplayIndex !== -1) {
      newQueue.splice(firstAutoplayIndex, 0, cleanTrack);
      newOriginal.splice(firstAutoplayIndex, 0, cleanTrack);
    } else {
      newQueue.push(cleanTrack);
      newOriginal.push(cleanTrack);
    }

    set({
      queue: newQueue,
      originalQueue: newOriginal,
    });
  },

  nextTrack: () => {
    const { queue, currentIndex } = get();
    if (currentIndex < queue.length - 1) {
      const nextIndex = currentIndex + 1;
      const nextTrack = queue[nextIndex];
      set({
        currentIndex: nextIndex,
        currentTrack: nextTrack,
        isPlaying: true,
      });
    }
  },

  prevTrack: () => {
    const { queue, currentIndex } = get();
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      const prevTrack = queue[prevIndex];
      set({
        currentIndex: prevIndex,
        currentTrack: prevTrack,
        isPlaying: true,
      });
    }
  },

  playPrevious: () => {
    get().prevTrack();
  },

  jumpToIndex: (index: number) => {
    const { queue } = get();
    if (index >= 0 && index < queue.length) {
      set({
        currentIndex: index,
        currentTrack: queue[index],
        isPlaying: true,
      });
    }
  },

  removeFromQueue: (index: number) => {
    const { queue, originalQueue, currentIndex, currentTrack } = get();
    if (index < 0 || index >= queue.length) return;

    const trackToRemove = queue[index];
    const newQueue = queue.filter((_, i) => i !== index);
    const newOriginal = originalQueue.filter(
      (t) => getTrackId(t) !== getTrackId(trackToRemove)
    );

    let newCurrentIndex = currentIndex;
    let newCurrentTrack = currentTrack;

    if (index < currentIndex) {
      newCurrentIndex = currentIndex - 1;
    } else if (index === currentIndex) {
      newCurrentTrack = newQueue[index] || newQueue[index - 1] || null;
      newCurrentIndex = newQueue[index] ? index : Math.max(0, index - 1);
    }

    set({
      queue: newQueue,
      originalQueue: newOriginal,
      currentIndex: newQueue.length === 0 ? -1 : newCurrentIndex,
      currentTrack: newCurrentTrack,
    });
  },

  clearQueue: () => {
    const { currentTrack } = get();
    set({
      queue: currentTrack ? [currentTrack] : [],
      originalQueue: currentTrack ? [currentTrack] : [],
      currentIndex: currentTrack ? 0 : -1,
    });
  },

  toggleShuffle: () => {
    const { isShuffle, queue, originalQueue, currentTrack } = get();
    if (!currentTrack) return;

    const currentTrackId = getTrackId(currentTrack);

    if (isShuffle) {
      // Turn OFF shuffle: restore original un-shuffled queue and match currentTrack
      const newIndex = originalQueue.findIndex(
        (t) => getTrackId(t) === currentTrackId
      );
      set({
        isShuffle: false,
        queue: [...originalQueue],
        currentIndex: newIndex !== -1 ? newIndex : 0,
      });
    } else {
      // Turn ON shuffle: keep current track at index 0, randomize upcoming tracks (Fisher-Yates)
      const remaining = queue.filter((t) => getTrackId(t) !== currentTrackId);
      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      }

      set({
        isShuffle: true,
        queue: [currentTrack, ...remaining],
        currentIndex: 0,
      });
    }
  },

  appendAutoplayTracks: (newTracks: Track[]) => {
    if (!newTracks || newTracks.length === 0) return;

    set((state) => {
      const existingIds = new Set(state.queue.map(getTrackId));
      const taggedAutoplay = newTracks
        .filter((t) => {
          const id = getTrackId(t);
          return id && !existingIds.has(id);
        })
        .map((t) => ({ ...t, isAutoplay: true }));

      if (taggedAutoplay.length === 0) return state;

      return {
        queue: [...state.queue, ...taggedAutoplay],
        originalQueue: [...state.originalQueue, ...taggedAutoplay],
      };
    });
  },

  reorderQueue: (startIndex: number, endIndex: number) => {
    set((state) => {
      const result = Array.from(state.queue);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);

      const currentTrackId = getTrackId(state.currentTrack);
      const newIndex = result.findIndex(
        (t) => getTrackId(t) === currentTrackId
      );

      return {
        queue: result,
        currentIndex: newIndex !== -1 ? newIndex : state.currentIndex,
      };
    });
  },

  setIsPlaying: (playing: boolean) => set({ isPlaying: playing }),
  setVolume: (volume: number) => set({ volume }),
  setCrossfadeDuration: (seconds: number) => set({ crossfadeDuration: Math.max(0, seconds) }),
  toggleAutoplay: () =>
    set((state) => ({ isAutoplayEnabled: !state.isAutoplayEnabled })),
  setIsQueueOpen: (open: boolean) => set({ isQueueOpen: open }),
  toggleQueue: () => set((state) => ({ isQueueOpen: !state.isQueueOpen })),
  setIsInstantLaunch: (isInstant: boolean) => set({ isInstantLaunch: isInstant }),
  addWarmedTrackId: (id: string) =>
    set((state) => ({
      warmedTrackIds: state.warmedTrackIds.includes(id)
        ? state.warmedTrackIds
        : [...state.warmedTrackIds, id],
    })),
}));
