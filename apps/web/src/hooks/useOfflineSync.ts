import { useState, useEffect } from 'react';
import localforage from 'localforage';
import { toast } from 'sonner';

// Define the Track interface inline or import it (we'll just use a compatible shape)
export interface OfflineTrackMetadata {
  id: string; // The provider track ID (e.g. YouTube ID)
  title: string;
  artist: string;
  albumArt: string;
  duration: number;
  downloadedAt: number;
}

// Dedicated stores
const audioBlobStore = localforage.createInstance({
  name: 'NocturnePlayer',
  storeName: 'audio_blobs',
});

const metadataStore = localforage.createInstance({
  name: 'NocturnePlayer',
  storeName: 'offline_metadata',
});

export const useOfflineSync = () => {
  const [downloadedTracks, setDownloadedTracks] = useState<Record<string, OfflineTrackMetadata>>({});
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  // Load metadata on mount
  useEffect(() => {
    const loadMetadata = async () => {
      const stored: Record<string, OfflineTrackMetadata> = {};
      await metadataStore.iterate<OfflineTrackMetadata, void>((value, key) => {
        stored[key] = value;
      });
      setDownloadedTracks(stored);
    };
    loadMetadata();
  }, []);

  const downloadTrack = async (track: any) => {
    const trackId = track.providerTrackId || track.id;
    if (!trackId) return;

    if (downloadedTracks[trackId] || downloadingIds.has(trackId)) return;

    setDownloadingIds((prev) => {
      const next = new Set(prev);
      next.add(trackId);
      return next;
    });

    const toastId = toast.loading(`Downloading ${track.title}...`);

    try {
      const token = localStorage.getItem('token');
      // Fetch the full audio blob
      const res = await fetch(`http://localhost:3001/music/proxy/youtube/${trackId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error('Failed to fetch audio stream');

      const blob = await res.blob();

      // Ensure it's a valid blob
      if (blob.size < 100000) throw new Error('Blob too small, likely an error response');

      const metadata: OfflineTrackMetadata = {
        id: trackId,
        title: track.title,
        artist: track.artist,
        albumArt: track.albumArt,
        duration: track.duration,
        downloadedAt: Date.now(),
      };

      // Save to IndexedDB
      await audioBlobStore.setItem(trackId, blob);
      await metadataStore.setItem(trackId, metadata);

      setDownloadedTracks((prev) => ({ ...prev, [trackId]: metadata }));
      toast.success(`${track.title} downloaded for offline playback`, { id: toastId });
    } catch (error: any) {
      toast.error(`Failed to download ${track.title}: ${error.message}`, { id: toastId });
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev);
        next.delete(trackId);
        return next;
      });
    }
  };

  const removeTrack = async (trackId: string) => {
    try {
      await audioBlobStore.removeItem(trackId);
      await metadataStore.removeItem(trackId);

      setDownloadedTracks((prev) => {
        const next = { ...prev };
        delete next[trackId];
        return next;
      });
      toast.success('Track removed from offline storage');
    } catch (e) {
      toast.error('Failed to remove offline track');
    }
  };

  const isDownloaded = (trackId: string) => {
    return !!downloadedTracks[trackId];
  };

  const isDownloading = (trackId: string) => {
    return downloadingIds.has(trackId);
  };

  return {
    downloadedTracks,
    downloadTrack,
    removeTrack,
    isDownloaded,
    isDownloading,
  };
};

export const getOfflineAudioBlobUrl = async (trackId: string): Promise<string | null> => {
  try {
    const blob = await audioBlobStore.getItem<Blob>(trackId);
    if (!blob) return null;
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
};
