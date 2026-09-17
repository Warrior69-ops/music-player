'use client';

import { usePlaylist } from '@/hooks/queries';
import { useParams, useRouter } from 'next/navigation';
import { Library, ArrowLeft } from 'lucide-react';
import { TrackCard } from '@/components/ui/TrackCard';

export default function PlaylistPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: playlist, isLoading } = usePlaylist(id);

  if (isLoading) {
    return (
      <div className="p-8 pb-32">
        <div className="animate-pulse h-8 w-64 bg-white/5 rounded-lg mb-8" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-white/5 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="p-8 pb-32 flex flex-col items-center justify-center text-center mt-20">
        <Library className="w-16 h-16 text-white/20 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Playlist not found</h2>
        <p className="text-muted-foreground mb-6">This playlist doesn't exist or has been deleted.</p>
        <button 
          onClick={() => router.back()}
          className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 pb-32">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => router.back()}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Library className="w-8 h-8 text-primary" />
            {playlist.name}
          </h1>
          {playlist.description && (
            <p className="text-muted-foreground mt-2">{playlist.description}</p>
          )}
          <p className="text-sm text-white/50 mt-1">{playlist.tracks?.length || 0} tracks</p>
        </div>
      </div>

      <div className="space-y-2">
        {playlist.tracks && playlist.tracks.length > 0 ? (
          playlist.tracks.map((track: any) => (
            <TrackCard key={track.providerTrackId} track={track} />
          ))
        ) : (
          <div className="text-center p-12 glass-panel rounded-xl mt-8">
            <p className="text-muted-foreground">This playlist is empty. Add some tracks!</p>
          </div>
        )}
      </div>
    </div>
  );
}
