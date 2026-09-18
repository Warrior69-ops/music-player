'use client';

import { useEffect, useRef } from 'react';
import { usePlayerStore, getTrackId, Track } from '@/store/usePlayerStore';
import api from '@/lib/api';

export function useAutoplayObserver() {
  const {
    queue,
    currentIndex,
    isAutoplayEnabled,
    appendAutoplayTracks,
  } = usePlayerStore();

  const isFetchingRef = useRef(false);
  const lastFetchedTrackIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAutoplayEnabled || queue.length === 0 || currentIndex === -1) return;

    const remainingTracks = queue.length - 1 - currentIndex;

    // Trigger fetch when 2 or fewer tracks remain ahead in the queue
    if (remainingTracks <= 2 && !isFetchingRef.current) {
      // Use the last track or current track as seed for continuous radio discovery
      const anchorTrack: Track | undefined = queue[queue.length - 1] || queue[currentIndex];
      const anchorId = getTrackId(anchorTrack);

      if (!anchorId || anchorId === lastFetchedTrackIdRef.current) return;

      const fetchRelated = async () => {
        isFetchingRef.current = true;
        lastFetchedTrackIdRef.current = anchorId;

        try {
          const res = await api.get(`/recommendations/related?trackId=${encodeURIComponent(anchorId)}`);
          if (res.data && Array.isArray(res.data) && res.data.length > 0) {
            appendAutoplayTracks(res.data);
          }
        } catch (error: any) {
          console.error('Failed to fetch autoplay recommendations:', error?.message || error);
        } finally {
          isFetchingRef.current = false;
        }
      };

      fetchRelated();
    }
  }, [currentIndex, queue.length, isAutoplayEnabled, appendAutoplayTracks, queue]);
}
