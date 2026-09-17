'use client';

import { usePlayerStore } from '@/store/usePlayerStore';
import { useLyrics } from '@/hooks/queries';
import { Music2 } from 'lucide-react';

export default function LyricsPage() {
  const { currentTrack } = usePlayerStore();
  const { data: lyricsData, isLoading } = useLyrics(currentTrack?.title, currentTrack?.artist, currentTrack?.duration);

  if (!currentTrack) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
        <Music2 className="w-16 h-16 mb-4 opacity-20" />
        <h2 className="text-xl font-medium text-white mb-2">No track playing</h2>
        <p>Play a song to see its lyrics here.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-8 pb-32 h-full overflow-y-auto">
      <div className="flex items-center gap-6 mb-12">
        {currentTrack.albumArt ? (
          <img src={currentTrack.albumArt} alt={currentTrack.title} className="w-32 h-32 rounded-xl shadow-2xl" />
        ) : (
          <div className="w-32 h-32 rounded-xl bg-white/10 flex items-center justify-center shadow-2xl">
            <Music2 className="w-12 h-12 text-white/20" />
          </div>
        )}
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">{currentTrack.title}</h1>
          <p className="text-xl text-primary">{currentTrack.artist}</p>
        </div>
      </div>

      <div className="space-y-6">
        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-6 bg-white/5 rounded w-3/4 max-w-md" />
            ))}
          </div>
        ) : lyricsData?.syncedLyrics ? (
          <div className="text-2xl font-medium leading-loose text-white/80 space-y-2 whitespace-pre-wrap">
            {/* Very simple parsing for LRCLIB synced lyrics to strip timestamps for clean display */}
            {lyricsData.syncedLyrics.replace(/\[\d{2}:\d{2}\.\d{2}\]/g, '')}
          </div>
        ) : lyricsData?.plainLyrics ? (
          <div className="text-2xl font-medium leading-loose text-white/80 whitespace-pre-wrap">
            {lyricsData.plainLyrics}
          </div>
        ) : (
          <div className="text-center p-12 glass rounded-2xl">
            <h3 className="text-xl text-white mb-2">Lyrics not found</h3>
            <p className="text-muted-foreground">We couldn't find lyrics for this specific track.</p>
          </div>
        )}
      </div>
    </div>
  );
}
