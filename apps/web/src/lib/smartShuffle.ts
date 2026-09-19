import { Track } from '@/store/usePlayerStore';

/**
 * Smart Shuffle Algorithm:
 * 1. Performs an unbiased Fisher-Yates shuffle on the track list.
 * 2. Applies an Anti-Clustering Smoothing Pass:
 *    Ensures consecutive tracks do not repeat the exact same artist when multiple artists exist.
 */
export function smartShuffleTracks(tracks: Track[]): Track[] {
  if (!tracks || tracks.length <= 2) {
    return [...tracks].reverse();
  }

  // 1. Fisher-Yates Uniform Shuffle
  const shuffled = [...tracks];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Check if playlist actually has multiple artists
  const distinctArtists = new Set(shuffled.map((t) => (t.artist || '').toLowerCase().trim()));
  if (distinctArtists.size <= 1) {
    return shuffled;
  }

  // 2. Anti-Clustering Pass (De-cluster consecutive same-artist tracks)
  for (let i = 0; i < shuffled.length - 1; i++) {
    const currentArtist = (shuffled[i].artist || '').toLowerCase().trim();
    const nextArtist = (shuffled[i + 1].artist || '').toLowerCase().trim();

    if (currentArtist && nextArtist && currentArtist === nextArtist) {
      // Find the nearest subsequent track with a different artist to swap
      let swapIndex = -1;
      for (let k = i + 2; k < shuffled.length; k++) {
        const candidateArtist = (shuffled[k].artist || '').toLowerCase().trim();
        if (candidateArtist !== currentArtist) {
          swapIndex = k;
          break;
        }
      }

      if (swapIndex !== -1) {
        [shuffled[i + 1], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[i + 1]];
      }
    }
  }

  return shuffled;
}
