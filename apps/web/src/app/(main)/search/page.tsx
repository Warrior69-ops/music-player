'use client';

import { useState, useEffect } from 'react';
import { useSearchMusic } from '@/hooks/queries';
import { TrackCard } from '@/components/ui/TrackCard';
import { Search as SearchIcon } from 'lucide-react';
import api from '@/lib/api';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [searchTrigger, setSearchTrigger] = useState('');
  const { data: tracks, isLoading } = useSearchMusic(searchTrigger);

  // Eager Pre-fetching: Silently resolve the top 3 YouTube stream URLs in the background
  useEffect(() => {
    if (tracks && tracks.length > 0) {
      const topYoutubeTracks = tracks.filter(t => t.provider === 'youtube').slice(0, 3);
      topYoutubeTracks.forEach(track => {
        // Hitting the proxy silently will force the backend to cache the stream URL
        api.get(`/music/proxy/youtube/${track.providerTrackId}/prefetch`).catch(() => {});
      });
    }
  }, [tracks]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchTrigger(query);
    }
  };

  return (
    <div className="p-8 pb-32">
      <h1 className="text-3xl font-bold text-white mb-6">Search</h1>
      
      <form onSubmit={handleSearch} className="relative max-w-2xl mb-10">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <SearchIcon className="h-5 w-5 text-muted-foreground" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="block w-full pl-12 pr-4 py-4 border border-white/10 rounded-2xl leading-5 bg-white/5 text-foreground placeholder-muted-foreground focus:outline-none focus:bg-white/10 focus:border-primary/50 transition-all text-lg"
          placeholder="What do you want to listen to?"
        />
        <button type="submit" className="hidden">Search</button>
      </form>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="aspect-square bg-white/5 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : tracks?.length ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {tracks.map((track, idx) => (
            <TrackCard key={`${track.providerTrackId}-${idx}`} track={track} />
          ))}
        </div>
      ) : searchTrigger ? (
        <div className="p-12 text-center text-muted-foreground">
          No results found for "{searchTrigger}"
        </div>
      ) : null}
    </div>
  );
}
