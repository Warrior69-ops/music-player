'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useHistory } from '@/hooks/queries';
import { TrackCard } from '@/components/ui/TrackCard';
import api from '@/lib/api';

export default function HomePage() {
  const { user } = useAuthStore();
  const { data: history, isLoading } = useHistory();

  // Eager pre-fetching: resolve top 3 recently played streams in the background
  useEffect(() => {
    if (history && history.length > 0) {
      const topYoutubeTracks = history.filter(t => t.provider === 'youtube').slice(0, 3);
      topYoutubeTracks.forEach(track => {
        api.get(`/music/proxy/youtube/${track.providerTrackId}/prefetch`).catch(() => {});
      });
    }
  }, [history]);

  if (!user) return null;

  return (
    <div className="p-8 pb-32">
      <h1 className="text-4xl font-bold text-white mb-2">Welcome back, {user.username}</h1>
      <p className="text-muted-foreground mb-8">Ready to discover something new?</p>

      <section>
        <h2 className="text-2xl font-semibold text-white mb-6">Recently Played</h2>
        {isLoading ? (
          <div className="flex gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-48 h-64 bg-white/5 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : history?.length ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {history.map((track, idx) => (
              <TrackCard key={`${track.providerTrackId}-${idx}`} track={track} />
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-xl bg-white/5 border border-white/10 text-center">
            <p className="text-muted-foreground">You haven't played any tracks yet. Try searching for something!</p>
          </div>
        )}
      </section>
    </div>
  );
}
