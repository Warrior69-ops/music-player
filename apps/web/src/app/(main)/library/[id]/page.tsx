'use client';

import { useState } from 'react';
import { usePlaylist } from '@/hooks/queries';
import { useParams, useRouter } from 'next/navigation';
import { Library, ArrowLeft } from 'lucide-react';
import { TrackCard } from '@/components/ui/TrackCard';
import { PlaylistCover } from '@/components/ui/PlaylistCover';
import { PlaylistActionBar } from '@/components/playlist/PlaylistActionBar';
import { EditPlaylistModal } from '@/components/playlist/EditPlaylistModal';
import { usePlayerStore } from '@/store/usePlayerStore';
import { smartShuffleTracks } from '@/lib/smartShuffle';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function PlaylistPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: playlist, isLoading, refetch } = usePlaylist(id);
  const { setQueue } = usePlayerStore();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="p-8 pb-32">
        <div className="animate-pulse h-8 w-64 bg-white/5 rounded-lg mb-8" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
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

  const tracks = playlist.tracks || [];
  const playlistSource = { type: 'playlist' as const, name: playlist.name, id: playlist._id || playlist.id };

  const handlePlayAll = () => {
    if (tracks.length === 0) return;
    setQueue(tracks, 0, playlistSource);
  };

  const handleSmartShuffle = () => {
    if (tracks.length === 0) return;
    const shuffled = smartShuffleTracks(tracks);
    setQueue(shuffled, 0, playlistSource);
    toast.success('Smart Shuffle enabled');
  };

  const handleDeletePlaylist = async () => {
    if (window.confirm(`Are you sure you want to delete "${playlist.name}"?`)) {
      try {
        await api.delete(`/playlists/${id}`);
        toast.success('Playlist deleted');
        router.push('/library');
      } catch (err: any) {
        toast.error('Failed to delete playlist');
      }
    }
  };

  const handleRemoveTrack = async (providerTrackId: string) => {
    try {
      await api.delete(`/playlists/${id}/tracks/${providerTrackId}`);
      toast.success('Removed track from playlist');
      refetch();
    } catch {
      toast.error('Failed to remove track');
    }
  };

  return (
    <div className="p-8 pb-32">
      {/* Back Button */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/library')}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white flex items-center gap-2 text-xs font-semibold"
          title="Back to Library"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Library</span>
        </button>
      </div>

      {/* Hero Header with Dynamic 2x2 Mosaic Cover */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-6">
        <PlaylistCover
          tracks={tracks}
          className="w-48 h-48 sm:w-56 sm:h-56 shrink-0 shadow-2xl rounded-2xl"
        />
        <div className="flex flex-col items-center md:items-start text-center md:text-left min-w-0 pb-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">
            Playlist
          </p>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-2 truncate max-w-xl">
            {playlist.name}
          </h1>
          {playlist.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 max-w-xl mb-2">
              {playlist.description}
            </p>
          )}
          <p className="text-xs text-white/50">
            Created by you • {tracks.length} track{tracks.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Playlist Hero Action Bar (Play, Smart Shuffle, Edit, Delete) */}
      <PlaylistActionBar
        tracks={tracks}
        onPlayAll={handlePlayAll}
        onSmartShuffle={handleSmartShuffle}
        onEdit={() => setIsEditModalOpen(true)}
        onDelete={handleDeletePlaylist}
      />

      {/* Track Grid without Red Bin Button */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {tracks.length > 0 ? (
          tracks.map((track: any, idx: number) => (
            <div key={`${track.providerTrackId}-${idx}`} className="relative">
              <TrackCard
                track={track}
                contextQueue={tracks}
                trackIndex={idx}
                queueSource={playlistSource}
                onRemoveFromPlaylist={() => handleRemoveTrack(track.providerTrackId)}
              />
            </div>
          ))
        ) : (
          <div className="col-span-full text-center p-12 glass-panel rounded-xl mt-4">
            <p className="text-muted-foreground text-sm">This playlist is empty. Add songs to get started!</p>
          </div>
        )}
      </div>

      {/* Edit Playlist Modal (Option C Hybrid Reordering) */}
      <EditPlaylistModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        playlist={playlist}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
