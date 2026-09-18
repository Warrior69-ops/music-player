'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePlayerStore } from '@/store/usePlayerStore';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useLyrics } from '@/hooks/queries';
import { Music2, Sparkles, ChevronDown } from 'lucide-react';
import { LyricsView } from '@/components/ui/LyricsView';

export default function LyricsPage() {
  const router = useRouter();
  const { currentTrack, isPlaying } = usePlayerStore();
  const { currentTime, seek } = useAudioPlayer();
  const { data: lyricsData, isLoading } = useLyrics(
    currentTrack?.title,
    currentTrack?.artist,
    currentTrack?.duration
  );

  const handleClose = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleSeek = (timeInSeconds: number) => {
    seek(timeInSeconds);
  };

  if (!currentTrack) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 relative">
        <button
          onClick={handleClose}
          className="absolute top-6 right-6 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all duration-200 border border-white/10"
          title="Back (Esc)"
        >
          <ChevronDown className="w-4 h-4" />
          <span className="text-xs font-medium">Back</span>
        </button>
        <Music2 className="w-16 h-16 mb-4 opacity-20" />
        <h2 className="text-xl font-medium text-white mb-2">No track playing</h2>
        <p className="mb-4">Play a song to view real-time progressive lyrics here.</p>
        <button
          onClick={handleClose}
          className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity text-sm shadow-lg shadow-primary/20"
        >
          Back to Player
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col relative">
      {/* Background ambient aura */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/20 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Header bar */}
      <div className="flex-shrink-0 flex items-center justify-between gap-6 p-8 pb-4 border-b border-white/5">
        <div className="flex items-center gap-5 min-w-0">
          {currentTrack.albumArt ? (
            <img
              src={currentTrack.albumArt}
              alt={currentTrack.title}
              className="w-20 h-20 rounded-2xl shadow-2xl object-cover ring-1 ring-white/10 flex-shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center shadow-2xl flex-shrink-0">
              <Music2 className="w-8 h-8 text-white/30" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-white truncate">{currentTrack.title}</h1>
            <p className="text-base md:text-lg text-primary font-medium truncate">{currentTrack.artist}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {lyricsData && lyricsData.isLineSynced && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/20 text-primary border border-primary/30 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Time-Synced</span>
            </div>
          )}

          <button
            onClick={handleClose}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all duration-200 hover:scale-105 active:scale-95 border border-white/10 shadow-lg group cursor-pointer"
            title="Minimize Lyrics (Esc)"
          >
            <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform text-white/90" />
            <span className="text-xs font-medium">Minimize</span>
          </button>
        </div>
      </div>

      {/* Main Lyrics Area */}
      <div className="flex-grow overflow-hidden relative">
        {isLoading ? (
          <div className="p-8 space-y-5 animate-pulse max-w-xl">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div
                key={i}
                className="h-8 bg-white/5 rounded-lg"
                style={{ width: `${Math.min(95, 40 + i * 9)}%` }}
              />
            ))}
          </div>
        ) : lyricsData && lyricsData.lyrics.length > 0 ? (
          <LyricsView
            lyricsData={lyricsData}
            currentTime={currentTime}
            isPlaying={isPlaying}
            onSeek={handleSeek}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-3/4 text-center p-8">
            <div className="p-10 glass rounded-3xl max-w-md border border-white/10 shadow-2xl">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Music2 className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Lyrics not found</h3>
              <p className="text-sm text-muted-foreground">
                We couldn't match time-synced lyrics for this track yet. Try another track or check back later!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
