'use client';

import { useOfflineSync } from '@/hooks/useOfflineSync';
import { TrackCard } from '@/components/ui/TrackCard';
import { Play, Shuffle, DownloadCloud } from 'lucide-react';
import { usePlayerStore } from '@/store/usePlayerStore';
import Link from 'next/link';

export default function DownloadedPage() {
  const { downloadedTracks } = useOfflineSync();
  const { playNext, setQueue, setIsPlaying } = usePlayerStore();

  const tracks = Object.values(downloadedTracks).map((t) => ({
    ...t,
    provider: 'youtube',
    providerTrackId: t.id,
    explicit: false,
    isStreamable: true,
  })) as any[];

  const handlePlayAll = () => {
    if (tracks.length === 0) return;
    setQueue(tracks, 0, { type: 'playlist', id: 'downloaded', name: 'Downloaded Tracks' });
    setIsPlaying(true);
  };

  const handleShufflePlay = () => {
    if (tracks.length === 0) return;
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    setQueue(shuffled, 0, { type: 'playlist', id: 'downloaded', name: 'Downloaded Tracks' });
    if (!usePlayerStore.getState().isShuffle) {
      usePlayerStore.getState().toggleShuffle();
    }
    setIsPlaying(true);
  };

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Header */}
      <div className="relative h-64 sm:h-80 w-full overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/60 via-blue-900/40 to-black z-0" />
        
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent z-10" />

        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 z-20 flex flex-col sm:flex-row items-end sm:items-center gap-6">
          <div className="w-32 h-32 sm:w-48 sm:h-48 shrink-0 shadow-2xl rounded-xl overflow-hidden bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center">
            <DownloadCloud className="w-16 h-16 sm:w-24 sm:h-24 text-white drop-shadow-md" />
          </div>
          
          <div className="flex flex-col flex-1">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white/70 mb-2">
              Playlist
            </span>
            <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-4 drop-shadow-lg line-clamp-2">
              Downloaded Tracks
            </h1>
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <span className="font-semibold text-white">Your Offline Collection</span>
              <span>•</span>
              <span>{tracks.length} tracks</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 sm:px-8 py-6 flex items-center gap-4 shrink-0">
        <button
          onClick={handlePlayAll}
          disabled={tracks.length === 0}
          className="w-14 h-14 flex items-center justify-center rounded-full bg-primary text-black hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] disabled:opacity-50 disabled:hover:scale-100"
          title="Play"
        >
          <Play className="w-6 h-6 fill-black ml-1" />
        </button>

        <button
          onClick={handleShufflePlay}
          disabled={tracks.length === 0}
          className="w-10 h-10 flex items-center justify-center rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          title="Shuffle Play"
        >
          <Shuffle className="w-5 h-5" />
        </button>
      </div>

      {/* Tracks */}
      <div className="flex-1 px-6 sm:px-8 pb-32">
        {tracks.length === 0 ? (
          <div className="text-center py-20">
            <DownloadCloud className="w-16 h-16 text-white/10 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No downloaded tracks</h3>
            <p className="text-sm text-zinc-400 mb-6">
              Download your favorite tracks to listen offline.
            </p>
            <Link 
              href="/"
              className="px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
            >
              Discover Music
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {tracks.map((track, idx) => (
              <TrackCard
                key={`${track.providerTrackId}-${idx}`}
                track={track}
                contextQueue={tracks}
                trackIndex={idx}
                queueSource={{ type: 'playlist', id: 'downloaded', name: 'Downloaded Tracks' }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
