'use client';

import { Play, Heart, Plus, ListPlus } from 'lucide-react';
import { usePlayerStore, Track } from '@/store/usePlayerStore';
import { useFavorites, useAddFavorite, useRemoveFavorite } from '@/hooks/queries';
import { toast } from 'sonner';
import { useUIStore } from '@/store/useUIStore';

interface TrackCardProps {
  track: Track;
}

export function TrackCard({ track }: TrackCardProps) {
  const { setCurrentTrack, queue, setQueue } = usePlayerStore();
  const { data: favorites } = useFavorites();
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();
  const { openPlaylistModal } = useUIStore();

  const isFavorite = favorites?.some(f => f.providerTrackId === track.providerTrackId);

  const handlePlay = () => {
    setCurrentTrack(track);
    if (!queue.find(t => t.providerTrackId === track.providerTrackId)) {
      setQueue([track, ...queue]);
    }
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFavorite) {
      removeFavorite.mutate(track.providerTrackId, {
        onSuccess: () => toast.success('Removed from favorites'),
        onError: () => toast.error('Failed to remove from favorites')
      });
    } else {
      addFavorite.mutate(track, {
        onSuccess: () => toast.success('Added to favorites!'),
        onError: () => toast.error('Failed to add to favorites')
      });
    }
  };

  const handleOpenPlaylistModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    openPlaylistModal(track);
  };

  const handleAddToQueue = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!queue.find(t => t.providerTrackId === track.providerTrackId)) {
      setQueue([...queue, track]);
      toast.success(`Added to queue!`);
    } else {
      toast('Already in queue');
    }
  };

  return (
    <div className="group relative bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/10 transition-colors cursor-pointer">
      <div className="aspect-square relative overflow-hidden">
        {track.albumArt ? (
          <img src={track.albumArt} alt={track.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full bg-white/5 flex items-center justify-center">
            <span className="text-muted-foreground text-xs">No Art</span>
          </div>
        )}
        
        {/* Play Button Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 backdrop-blur-[2px]">
          <div className="flex items-center gap-3">
            <button onClick={handleFavorite} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white backdrop-blur-md">
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-primary text-primary' : ''}`} />
            </button>
            <button 
              onClick={handlePlay}
              className="w-14 h-14 rounded-full bg-primary hover:bg-accent flex items-center justify-center text-black shadow-xl scale-90 group-hover:scale-100 transition-all delay-75"
            >
              <Play className="w-6 h-6 translate-x-0.5 fill-current" />
            </button>
            <button onClick={handleAddToQueue} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white backdrop-blur-md" title="Add to Queue">
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <button 
            onClick={handleOpenPlaylistModal}
            className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-medium backdrop-blur-md flex items-center gap-2"
          >
            <ListPlus className="w-4 h-4" /> Add to Playlist
          </button>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-white truncate" title={track.title}>{track.title}</h3>
        <p className="text-sm text-muted-foreground truncate mt-1" title={track.artist}>{track.artist}</p>
      </div>
    </div>
  );
}
