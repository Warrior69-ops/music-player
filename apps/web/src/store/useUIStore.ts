import { create } from 'zustand';
import { Track } from './usePlayerStore';

interface UIState {
  isPlaylistModalOpen: boolean;
  playlistModalTrack: Track | null;
  previousPath: string;
  isVisualizerOpen: boolean;
  visualizerMode: 'waves' | 'bars' | 'radial';
  isNowPlayingClosing: boolean;

  openPlaylistModal: (track?: Track | null) => void;
  closePlaylistModal: () => void;
  setPreviousPath: (path: string) => void;
  openVisualizer: () => void;
  closeVisualizer: () => void;
  toggleVisualizer: () => void;
  setVisualizerMode: (mode: 'waves' | 'bars' | 'radial') => void;
  setIsNowPlayingClosing: (closing: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isPlaylistModalOpen: false,
  playlistModalTrack: null,
  previousPath: '/',
  isVisualizerOpen: false,
  visualizerMode: 'waves',
  isNowPlayingClosing: false,

  openPlaylistModal: (track = null) =>
    set({ isPlaylistModalOpen: true, playlistModalTrack: track || null }),
  closePlaylistModal: () =>
    set({ isPlaylistModalOpen: false, playlistModalTrack: null }),
  setPreviousPath: (path: string) => set({ previousPath: path }),

  openVisualizer: () => set({ isVisualizerOpen: true }),
  closeVisualizer: () => set({ isVisualizerOpen: false }),
  toggleVisualizer: () => set((state) => ({ isVisualizerOpen: !state.isVisualizerOpen })),
  setVisualizerMode: (mode) => set({ visualizerMode: mode }),
  setIsNowPlayingClosing: (closing) => set({ isNowPlayingClosing: closing }),
}));
