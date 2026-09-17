'use client';

import { usePlaylists } from '@/hooks/queries';
import { Library, Plus } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import Link from 'next/link';

export default function LibraryPage() {
  const { data: playlists, isLoading } = usePlaylists();
  const { openPlaylistModal } = useUIStore();

  return (
    <div className="p-8 pb-32">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">Your Library</h1>
        <button 
          onClick={() => openPlaylistModal()}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-full hover:bg-accent hover:scale-105 transition-all"
        >
          <Plus className="w-5 h-5" />
          Create Playlist
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-48 bg-white/5 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : playlists?.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {playlists.map((playlist: any) => (
            <Link key={playlist._id} href={`/library/${playlist._id}`}>
              <div className="glass-panel p-6 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group flex flex-col h-full">
                <div className="w-16 h-16 rounded-lg bg-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/40 transition-colors">
                  <Library className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg text-white truncate">{playlist.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{playlist.tracks?.length || 0} tracks</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="p-8 rounded-xl bg-white/5 border border-white/10 text-center">
          <p className="text-muted-foreground">No playlists found. Create one to get started!</p>
        </div>
      )}
    </div>
  );
}
