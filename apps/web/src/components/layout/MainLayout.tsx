'use client';

import { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PlayerBar } from './PlayerBar';
import { PlaylistModal } from '../ui/PlaylistModal';
import { QueueDrawer } from '../ui/QueueDrawer';
import { useUIStore } from '@/store/useUIStore';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useAutoplayObserver } from '@/hooks/useAutoplay';
import api from '@/lib/api';

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { isPlaylistModalOpen, closePlaylistModal, playlistModalTrack } = useUIStore();
  const { currentTrack, setCurrentTrack, setIsPlaying } = usePlayerStore();

  // Run infinite autoplay observer in the background
  useAutoplayObserver();

  useEffect(() => {
    if (!currentTrack) {
      api.get('/history').then(res => {
        const history = res.data?.data;
        if (history && history.length > 0) {
          // Initialize with the last played track but keep it paused
          usePlayerStore.setState({ currentTrack: history[0], isPlaying: false });
        }
      }).catch(() => {
        // Startup or unauthenticated check - ignore safely
      });
    }
  }, []);

  // Global Spacebar Play/Pause shortcut handler
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const activeEl = document.activeElement;
        const tagName = activeEl?.tagName.toLowerCase();
        const isEditable =
          tagName === 'input' ||
          tagName === 'textarea' ||
          (activeEl as HTMLElement)?.isContentEditable;

        // Do not intercept if user is typing into an input field or textarea
        if (isEditable) return;

        // Prevent browser page scroll
        e.preventDefault();

        const { currentTrack, isPlaying, setIsPlaying } = usePlayerStore.getState();
        if (currentTrack) {
          setIsPlaying(!isPlaying);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  return (
    <div className="h-screen w-full flex bg-background text-foreground overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden relative min-w-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        
        <Header />
        <div className="flex-1 overflow-y-auto z-10 min-w-0">
          {children}
        </div>
        <PlayerBar />
      </div>

      <PlaylistModal 
        isOpen={isPlaylistModalOpen} 
        onClose={closePlaylistModal} 
        track={playlistModalTrack} 
      />
      <QueueDrawer />
    </div>
  );
}
