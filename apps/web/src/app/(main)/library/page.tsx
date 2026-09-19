'use client';

import { usePlaylists } from '@/hooks/queries';
import { Library, Plus } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import { PlaylistCover } from '@/components/ui/PlaylistCover';
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
          className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-semibold rounded-full hover:bg-accent hover:scale-105 transition-all shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Create Playlist
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="aspect-square bg-white/5 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : playlists?.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {playlists.map((playlist: any) => (
            <Link key={playlist._id} href={`/library/${playlist._id}`}>
              <div className="group relative bg-white/5 border border-white/10 rounded-xl overflow-hidden p-3.5 hover:bg-white/10 transition-all duration-300 cursor-pointer flex flex-col h-full">
                <PlaylistCover tracks={playlist.tracks} className="w-full mb-3 rounded-lg shadow-md" />
                <h3 className="font-semibold text-sm text-white truncate group-hover:text-primary transition-colors">
                  {playlist.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {playlist.tracks?.length || 0} track{playlist.tracks?.length !== 1 ? 's' : ''}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="p-12 rounded-2xl bg-white/5 border border-white/10 text-center">
          <p className="text-muted-foreground">No playlists found. Create one to get started!</p>
        </div>
      )}
    </div>
  );
}
