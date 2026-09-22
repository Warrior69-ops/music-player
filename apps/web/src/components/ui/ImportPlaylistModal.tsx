import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { useCreatePlaylist, useAddTracksToPlaylistBulk } from '@/hooks/queries';
import api from '@/lib/api';

interface ImportPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportPlaylistModal({ isOpen, onClose }: ImportPlaylistModalProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const createPlaylist = useCreatePlaylist();
  const addTracksBulk = useAddTracksToPlaylistBulk();

  if (!isOpen) return null;

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    const toastId = toast.loading('Importing playlist...');

    try {
      const res = await api.post('/music/playlist/import', { url });
      const data = res.data.data;

      if (!data || !data.tracks || data.tracks.length === 0) {
        throw new Error('No tracks found in the playlist URL');
      }

      const playlistName = data.title || data.name || 'Imported Playlist';
      
      createPlaylist.mutate(
        { name: playlistName },
        {
          onSuccess: async (newPlaylist) => {
            const notFoundTracks: string[] = [];
            const validTracks: any[] = [];
            
            for (const t of data.tracks) {
              try {
                let trackToAdd = t;
                if (!t.providerTrackId && !t.id) {
                  const searchRes = await api.get(`/music/search?q=${encodeURIComponent(t.title + ' ' + (t.artist || ''))}&type=song`);
                  if (searchRes.data?.data?.[0]) {
                    trackToAdd = searchRes.data.data[0];
                  } else {
                    notFoundTracks.push(`${t.title} by ${t.artist || 'Unknown'}`);
                    continue; 
                  }
                }
                validTracks.push(trackToAdd);
              } catch (err) {
                console.error('Failed to resolve track', err);
                notFoundTracks.push(`${t.title} by ${t.artist || 'Unknown'}`);
              }
            }
            
            if (validTracks.length > 0) {
              await addTracksBulk.mutateAsync({ 
                playlistId: (newPlaylist as any)._id || (newPlaylist as any).id, 
                tracks: validTracks 
              });
            }
            
            if (notFoundTracks.length > 0) {
              toast.success(`Imported ${validTracks.length} tracks to ${playlistName}.`, { id: toastId });
              setTimeout(() => {
                toast.warning(`${notFoundTracks.length} tracks were not found:\n${notFoundTracks.slice(0, 5).join(', ')}${notFoundTracks.length > 5 ? '...' : ''}`, {
                  duration: 8000,
                });
              }, 500);
            } else {
              toast.success(`Imported ${validTracks.length} tracks to ${playlistName}`, { id: toastId });
            }
            
            onClose();
          },
          onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to create playlist', { id: toastId });
          }
        }
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Import failed', { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">Import Playlist</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <form onSubmit={handleImport} className="flex gap-2 mb-2">
            <input
              type="text"
              placeholder="Spotify, Apple Music, or YouTube URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors"
            />
            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="px-4 py-2 bg-primary text-black font-semibold rounded-xl hover:bg-accent disabled:opacity-50 disabled:hover:bg-primary transition-colors"
            >
              {isLoading ? 'Importing...' : 'Import'}
            </button>
          </form>
          <p className="text-xs text-zinc-500">
            Note: Spotify & Apple Music import requires searching YouTube for each track and may take a few moments.
          </p>
        </div>
      </div>
    </div>
  );
}
