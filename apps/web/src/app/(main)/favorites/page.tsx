'use client';

import { useEffect } from 'react';
import { useFavorites } from '@/hooks/queries';
import { TrackCard } from '@/components/ui/TrackCard';
import { PlaylistActionBar } from '@/components/playlist/PlaylistActionBar';
import { usePlayerStore } from '@/store/usePlayerStore';
import { smartShuffleTracks } from '@/lib/smartShuffle';
import { Heart, ChevronLeft } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import Link from 'next/link';

export default function FavoritesPage() {
  const { data: favorites, isLoading } = useFavorites();
  const { setQueue } = usePlayerStore();

  const tracks = favorites || [];

  const favoritesSource = { type: 'favorites' as const, name: 'Liked Music' };

  const handlePlayAll = () => {
    if (tracks.length === 0) return;
    setQueue(tracks, 0, favoritesSource);
  };

  const handleSmartShuffle = () => {
    if (tracks.length === 0) return;
    const shuffled = smartShuffleTracks(tracks);
    setQueue(shuffled, 0, favoritesSource);
    toast.success('Smart Shuffle enabled for Favorites');
  };

  return (
    <div className="p-8 pb-32">
      <div className="mb-6">
        <Link
          href="/library"
          className="inline-flex w-fit p-2 pr-4 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white items-center gap-2 text-xs font-semibold"
          title="Back to Library"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Library</span>
        </Link>
      </div>
      
      {/* Hero Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 mb-8">
        <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl bg-gradient-to-br from-pink-600 via-purple-600 to-primary shadow-2xl flex items-center justify-center shrink-0 border border-white/10">
          <Heart className="w-24 h-24 text-white fill-current drop-shadow-lg" />
        </div>
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left pb-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">
            Collection
          </p>
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-2">
            Favorites
          </h1>
          <p className="text-xs text-white/50">
            Curated by you • {tracks.length} track{tracks.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Hero Action Bar (Play All, Smart Shuffle) */}
      <PlaylistActionBar
        tracks={tracks}
        onPlayAll={handlePlayAll}
        onSmartShuffle={handleSmartShuffle}
      />

      {/* Tracks Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="aspect-square bg-white/5 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : tracks.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {tracks.map((track, idx) => (
            <TrackCard
              key={`${track.providerTrackId}-${idx}`}
              track={track}
              contextQueue={tracks}
              trackIndex={idx}
              queueSource={favoritesSource}
            />
          ))}
        </div>
      ) : (
        <div className="p-12 rounded-2xl bg-white/5 border border-white/10 text-center">
          <p className="text-muted-foreground text-sm">
            You haven't added any favorites yet. Click the heart icon on any song to save it here!
          </p>
        </div>
      )}
    </div>
  );
}
