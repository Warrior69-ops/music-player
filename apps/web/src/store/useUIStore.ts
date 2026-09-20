import { create } from 'zustand';
import { Track } from './usePlayerStore';

interface UIState {
  isPlaylistModalOpen: boolean;
  playlistModalTrack: Track | null;
  previousPath: string;
  openPlaylistModal: (track?: Track | null) => void;
  closePlaylistModal: () => void;
  setPreviousPath: (path: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isPlaylistModalOpen: false,
  playlistModalTrack: null,
  previousPath: '/',
  openPlaylistModal: (track = null) => set({ isPlaylistModalOpen: true, playlistModalTrack: track || null }),
  closePlaylistModal: () => set({ isPlaylistModalOpen: false, playlistModalTrack: null }),
  setPreviousPath: (path: string) => set({ previousPath: path }),
}));
