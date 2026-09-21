import localforage from 'localforage';

const MAX_CACHED_TRACKS = 25;

const autoCacheStore = localforage.createInstance({
  name: 'NocturnePlayer',
  storeName: 'auto_audio_cache',
});

const autoCacheIndexStore = localforage.createInstance({
  name: 'NocturnePlayer',
  storeName: 'auto_audio_index',
});

/**
 * Retrieve cached audio blob as an object URL if available (0ms instant playback)
 */
export async function getCachedAudioBlobUrl(trackId: string): Promise<string | null> {
  if (typeof window === 'undefined' || !trackId) return null;
  try {
    const blob = await autoCacheStore.getItem<Blob>(trackId);
    if (blob && blob.size > 50000) {
      // Touch timestamp for LRU
      await autoCacheIndexStore.setItem(trackId, Date.now()).catch(() => {});
      return URL.createObjectURL(blob);
    }
  } catch (e) {
    console.debug('[AudioCache] Failed to read cached blob:', e);
  }
  return null;
}

const cachingInProgress = new Set<string>();

/**
 * Opportunistically saves a track audio stream into the browser's local cache in the background
 */
export async function autoCacheTrackAudio(trackId: string, streamUrl: string): Promise<void> {
  if (typeof window === 'undefined' || !trackId || !streamUrl) return;
  // Skip if already blob or data url
  if (streamUrl.startsWith('blob:') || streamUrl.startsWith('data:')) return;
  if (cachingInProgress.has(trackId)) return;

  try {
    const exists = await autoCacheStore.getItem<Blob>(trackId);
    if (exists && exists.size > 50000) return;

    cachingInProgress.add(trackId);

    // Opportunistically fetch in background (browser request queue)
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const res = await fetch(streamUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) return;
    const blob = await res.blob();
    if (blob.size < 50000) return; // Skip small invalid error responses

    await autoCacheStore.setItem(trackId, blob);
    await autoCacheIndexStore.setItem(trackId, Date.now());

    // Evict oldest if exceeding MAX_CACHED_TRACKS
    const keys: Array<{ trackId: string; timestamp: number }> = [];
    await autoCacheIndexStore.iterate<number, void>((timestamp, key) => {
      keys.push({ trackId: key, timestamp });
    });

    if (keys.length > MAX_CACHED_TRACKS) {
      keys.sort((a, b) => a.timestamp - b.timestamp);
      const toRemove = keys.slice(0, keys.length - MAX_CACHED_TRACKS);
      for (const item of toRemove) {
        await autoCacheStore.removeItem(item.trackId);
        await autoCacheIndexStore.removeItem(item.trackId);
      }
    }
  } catch (err) {
    console.debug('[AudioCache] Background caching skipped:', err);
  } finally {
    cachingInProgress.delete(trackId);
  }
}
