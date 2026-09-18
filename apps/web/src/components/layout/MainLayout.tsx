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

  return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
          
          <Header />
          <div className="flex-1 overflow-y-auto z-10">
            {children}
          </div>
        </main>
      </div>
      <PlayerBar />
      <PlaylistModal 
        isOpen={isPlaylistModalOpen} 
        onClose={closePlaylistModal} 
        track={playlistModalTrack} 
      />
      <QueueDrawer />
    </div>
  );
}
