import { create } from 'zustand';
import { Track } from './usePlayerStore';

interface UIState {
  isPlaylistModalOpen: boolean;
  playlistModalTrack: Track | null;
  openPlaylistModal: (track?: Track | null) => void;
  closePlaylistModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isPlaylistModalOpen: false,
  playlistModalTrack: null,
  openPlaylistModal: (track = null) => set({ isPlaylistModalOpen: true, playlistModalTrack: track || null }),
  closePlaylistModal: () => set({ isPlaylistModalOpen: false, playlistModalTrack: null }),
}));
