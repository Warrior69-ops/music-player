'use client';

import { useEffect } from 'react';
import { useFavorites } from '@/hooks/queries';
import { TrackCard } from '@/components/ui/TrackCard';
import { Heart } from 'lucide-react';
import api from '@/lib/api';

export default function FavoritesPage() {
  const { data: favorites, isLoading } = useFavorites();

  useEffect(() => {
    if (favorites && favorites.length > 0) {
      const topYoutubeTracks = favorites.filter(t => t.provider === 'youtube').slice(0, 3);
      topYoutubeTracks.forEach(track => {
        api.get(`/music/proxy/youtube/${track.providerTrackId}/prefetch`).catch(() => {});
      });
    }
  }, [favorites]);

  return (
    <div className="p-8 pb-32">
      <div className="flex items-end gap-6 mb-10">
        <div className="w-48 h-48 rounded-xl bg-gradient-to-br from-purple-500 to-primary shadow-2xl flex items-center justify-center">
          <Heart className="w-20 h-20 text-white fill-current" />
        </div>
        <div className="pb-2">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-2">Playlist</p>
          <h1 className="text-5xl font-bold text-white mb-4">Favorites</h1>
          <p className="text-muted-foreground">{favorites?.length || 0} tracks</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="aspect-square bg-white/5 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : favorites?.length ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {favorites.map((track, idx) => (
            <TrackCard key={`${track.providerTrackId}-${idx}`} track={track} />
          ))}
        </div>
      ) : (
        <div className="p-8 rounded-xl bg-white/5 border border-white/10 text-center">
          <p className="text-muted-foreground">You haven't added any favorites yet.</p>
        </div>
      )}
    </div>
  );
}
