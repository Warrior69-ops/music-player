'use client';

import { useState } from 'react';
import { usePlaylists, useCreatePlaylist, useAddTrackToPlaylist } from '@/hooks/queries';
import { Track } from '@/store/usePlayerStore';
import { toast } from 'sonner';
import { X, Plus, Loader2 } from 'lucide-react';

interface PlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track | Track[] | null;
}

export function PlaylistModal({ isOpen, onClose, track }: PlaylistModalProps) {
  const { data: playlists, isLoading } = usePlaylists();
  const createPlaylist = useCreatePlaylist();
  const addTrack = useAddTrackToPlaylist();

  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    createPlaylist.mutate(
      { name: newPlaylistName },
      {
        onSuccess: () => {
          setNewPlaylistName('');
          setIsCreating(false);
          toast.success('Playlist created!');
        },
        onError: () => toast.error('Failed to create playlist')
      }
    );
  };

  const handleAddToPlaylist = async (playlistId: string, playlistName: string) => {
    if (!track) return;
    
    try {
      if (Array.isArray(track)) {
        // Add all tracks sequentially
        for (const t of track) {
          await addTrack.mutateAsync({ playlistId, track: t });
        }
        toast.success(`Added ${track.length} tracks to ${playlistName}`);
      } else {
        await addTrack.mutateAsync({ playlistId, track });
        toast.success(`Added to ${playlistName}`);
      }
      onClose();
    } catch (e) {
      toast.error('Failed to add to playlist');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 transition-all"
      style={{
        WebkitBackdropFilter: 'blur(28px) saturate(135%)',
        backdropFilter: 'blur(28px) saturate(135%)',
      }}
    >
      <div
        className="w-full max-w-md liquid-glass-card rounded-3xl border border-white/12 shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[80vh] transform-gpu will-change-transform animate-in fade-in zoom-in-95 duration-200"
        style={{
          WebkitBackdropFilter: 'blur(28px) saturate(135%)',
          backdropFilter: 'blur(28px) saturate(135%)',
        }}
      >
        
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-xl font-semibold text-white">Add to Playlist</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-muted-foreground hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          {isCreating ? (
            <form onSubmit={handleCreate} className="mb-6 space-y-3">
              <input
                type="text"
                autoFocus
                placeholder="Playlist name..."
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/10 focus:border-primary outline-none text-white"
              />
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsCreating(false)}
                  className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={createPlaylist.isPending || !newPlaylistName.trim()}
                  className="flex-1 py-2 rounded-lg bg-primary hover:bg-accent text-black text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {createPlaylist.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          ) : (
            <button 
              onClick={() => setIsCreating(true)}
              className="w-full mb-6 p-4 rounded-xl border border-dashed border-white/20 hover:border-primary/50 hover:bg-primary/5 flex items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span className="font-medium">New Playlist</span>
            </button>
          )}

          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">Your Playlists</h3>
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : playlists?.length ? (
              playlists.map((pl: any) => (
                <button
                  key={pl._id}
                  onClick={() => handleAddToPlaylist(pl._id, pl.name)}
                  className="w-full text-left p-3 rounded-lg hover:bg-white/5 flex items-center gap-3 transition-colors group"
                >
                  <div className="w-10 h-10 bg-white/10 rounded flex items-center justify-center shrink-0">
                    <span className="text-white font-medium">{pl.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium text-white truncate">{pl.name}</p>
                    <p className="text-xs text-muted-foreground">{pl.tracks?.length || 0} tracks</p>
                  </div>
                  <Plus className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))
            ) : (
              <p className="text-center text-sm text-muted-foreground py-8">No playlists found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
