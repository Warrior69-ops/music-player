import { create } from 'zustand';

export interface Track {
  provider: string;
  providerTrackId: string;
  title: string;
  artist: string;
  albumArt?: string;
  duration?: number;
  releaseDate?: Date;
  genre?: string;
  explicit?: boolean;
  streamUrl?: string;
  audioUrl?: string;
  previewUrl?: string;
  isStreamable?: boolean;
}

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  queue: Track[];
  setCurrentTrack: (track: Track) => void;
  setIsPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  setQueue: (queue: Track[]) => void;
  playNext: () => void;
  playPrevious: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentTrack: null,
  isPlaying: false,
  volume: 1,
  queue: [],
  setCurrentTrack: (track) => set({ currentTrack: track, isPlaying: true }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setVolume: (volume) => set({ volume }),
  setQueue: (queue) => set({ queue }),
  playNext: () => set((state) => {
    const currentIndex = state.queue.findIndex(t => t.providerTrackId === state.currentTrack?.providerTrackId);
    if (currentIndex !== -1 && currentIndex < state.queue.length - 1) {
      return { currentTrack: state.queue[currentIndex + 1], isPlaying: true };
    }
    return state;
  }),
  playPrevious: () => set((state) => {
    const currentIndex = state.queue.findIndex(t => t.providerTrackId === state.currentTrack?.providerTrackId);
    if (currentIndex > 0) {
      return { currentTrack: state.queue[currentIndex - 1], isPlaying: true };
    }
    return state;
  }),
}));
