'use client';

import { usePlaylists, useFavorites } from '@/hooks/queries';
import { Library, Plus } from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';
import { PlaylistCover } from '@/components/ui/PlaylistCover';
import { PlaylistMenu } from '@/components/ui/PlaylistMenu';
import Link from 'next/link';
import { Heart } from 'lucide-react';

export default function LibraryPage() {
  const { data: playlists, isLoading } = usePlaylists();
  const { data: favorites } = useFavorites();
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
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {/* Favorites Card */}
          <Link href="/favorites">
            <div className="group relative bg-white/5 border border-white/10 rounded-xl overflow-hidden p-3.5 hover:bg-white/10 transition-all duration-300 cursor-pointer flex flex-col h-full">
              <div className="absolute top-5 right-5 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                <PlaylistMenu 
                  tracks={favorites || []} 
                  playlistName="Favorites" 
                  playlistId="favorites" 
                  type="favorites" 
                />
              </div>
              <div className="w-full aspect-square mb-3 rounded-lg shadow-md bg-gradient-to-br from-pink-600 via-purple-600 to-primary flex items-center justify-center">
                <Heart className="w-12 h-12 text-white drop-shadow-md fill-white" />
              </div>
              <h3 className="font-semibold text-sm text-white truncate group-hover:text-primary transition-colors">
                Favorites
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {favorites?.length || 0} track{favorites?.length !== 1 ? 's' : ''}
              </p>
            </div>
          </Link>

          {/* User Playlists */}
          {playlists?.map((playlist: any) => (
            <Link key={playlist._id} href={`/library/${playlist._id}`}>
              <div className="group relative bg-white/5 border border-white/10 rounded-xl overflow-hidden p-3.5 hover:bg-white/10 transition-all duration-300 cursor-pointer flex flex-col h-full">
                <div className="absolute top-5 right-5 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                  <PlaylistMenu 
                    tracks={playlist.tracks || []} 
                    playlistName={playlist.name} 
                    playlistId={playlist._id} 
                    type="playlist" 
                  />
                </div>
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
      )}
    </div>
  );
}
