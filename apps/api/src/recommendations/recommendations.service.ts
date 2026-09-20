import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { getClient } from '../scraper/youtubeScraper';
import { UsersService } from '../users/users.service';
import { HistoryService } from '../history/history.service';

export interface RecommendedTrack {
  provider: string;
  providerTrackId: string;
  id: string;
  title: string;
  artist: string;
  albumArt: string;
  duration: number;
  isStreamable: boolean;
}

export interface RecommendationShelf {
  id: string;
  title: string;
  description?: string;
  type: 'track-list';
  items: RecommendedTrack[];
}

export interface ArtistSearchResult {
  id: string;
  name: string;
  thumbnail: string;
  subscribers?: string;
}

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly historyService: HistoryService,
  ) {}

  /**
   * Search YouTube Music for artists (used by Step 2 of Onboarding)
   */
  async searchArtists(query: string): Promise<ArtistSearchResult[]> {
    if (!query || !query.trim()) return [];

    try {
      const yt = await getClient();
      const results = await yt.music.search(query.trim(), { type: 'artist' });
      const artistItems = results.artists?.contents || [];

      return artistItems
        .filter((item: any) => item.id && item.name)
        .map((item: any) => {
          const thumbUrl =
            item.thumbnail?.contents?.[0]?.url ||
            item.thumbnails?.[0]?.url ||
            '';

          return {
            id: item.id,
            name: item.name,
            thumbnail: thumbUrl,
            subscribers: item.subtitle?.text || '',
          };
        });
    } catch (err: any) {
      this.logger.error(`Artist search failed for "${query}": ${err.message}`);
      return [];
    }
  }

  /**
   * UpNext radio resolver for a single track
   */
  async getRelatedTracks(trackId: string): Promise<RecommendedTrack[]> {
    if (!trackId) return [];

    try {
      const yt = await getClient();
      let contents: any[] = [];

      // 1. Primary: Use YouTube Music getUpNext radio resolver
      if (yt.music && typeof yt.music.getUpNext === 'function') {
        try {
          const upNext = await yt.music.getUpNext(trackId);
          if (upNext.contents && upNext.contents.length > 0) {
            contents = upNext.contents;
          }
        } catch (e: any) {
          this.logger.debug(
            `music.getUpNext failed for ${trackId}: ${e.message}`,
          );
        }
      }

      // 2. Secondary fallback: InnerTube getUpNext
      if (
        contents.length === 0 &&
        typeof (yt as any).getUpNext === 'function'
      ) {
        try {
          const upNext = await (yt as any).getUpNext(trackId);
          if (upNext.contents && upNext.contents.length > 0) {
            contents = upNext.contents;
          }
        } catch (e: any) {
          this.logger.debug(
            `client.getUpNext failed for ${trackId}: ${e.message}`,
          );
        }
      }

      if (contents.length === 0) {
        return [];
      }

      return contents
        .filter((item: any) => {
          const videoId = item.video_id || item.id;
          return videoId && videoId !== trackId;
        })
        .map((item: any): RecommendedTrack => {
          const videoId = item.video_id || item.id;
          const thumbUrl =
            item.thumbnail?.[0]?.url ||
            item.thumbnails?.[0]?.url ||
            (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '');

          const artistName =
            item.artists?.[0]?.name ||
            item.author?.name ||
            item.artists?.[0] ||
            'Unknown Artist';

          const title =
            item.title?.toString?.() || item.title || 'Unknown Title';
          const duration = item.duration?.seconds || 0;

          return {
            provider: 'youtube',
            providerTrackId: videoId,
            id: videoId,
            title,
            artist:
              typeof artistName === 'string' ? artistName : 'Unknown Artist',
            albumArt: thumbUrl,
            duration,
            isStreamable: true,
          };
        });
    } catch (err: any) {
      this.logger.error(`Autoplay fetch failed for ${trackId}: ${err.message}`);
      return [];
    }
  }

  /**
   * Helper: Get top songs for an artist
   */
  private async getArtistTopTracks(
    artistId: string,
    fallbackArtistName?: string,
    limit = 5,
  ): Promise<RecommendedTrack[]> {
    try {
      const yt = await getClient();
      const artist = await yt.music.getArtist(artistId);
      const topSongsSection = artist.sections?.find(
        (s: any) =>
          s.title?.text?.toLowerCase().includes('song') ||
          s.type === 'MusicShelf',
      );

      if (topSongsSection && topSongsSection.contents?.length > 0) {
        return topSongsSection.contents
          .slice(0, limit)
          .map((item: any): RecommendedTrack => {
            const videoId = item.id || item.video_id;
            const thumbUrl =
              item.thumbnail?.contents?.[0]?.url ||
              item.thumbnails?.[0]?.url ||
              (videoId
                ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
                : '');

            const title =
              item.title?.text ||
              item.title?.toString?.() ||
              item.title ||
              'Unknown Title';
            const artistName =
              item.artists?.[0]?.name ||
              item.author?.name ||
              fallbackArtistName ||
              'Unknown Artist';

            return {
              provider: 'youtube',
              providerTrackId: videoId,
              id: videoId,
              title,
              artist: artistName,
              albumArt: thumbUrl,
              duration: item.duration?.seconds || 0,
              isStreamable: true,
            };
          });
      }
    } catch (err: any) {
      this.logger.debug(
        `getArtistTopTracks failed for ${artistId}: ${err.message}`,
      );
    }

    // Fallback: search for top tracks by artist name
    if (fallbackArtistName) {
      try {
        const yt = await getClient();
        const searchRes = await yt.music.search(`${fallbackArtistName} songs`, {
          type: 'song',
        });
        const songs = searchRes.songs?.contents || [];
        return songs.slice(0, limit).map((item: any): RecommendedTrack => {
          const videoId = item.id;
          const thumbUrl =
            item.thumbnails?.[0]?.url ||
            (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '');

          return {
            provider: 'youtube',
            providerTrackId: videoId,
            id: videoId,
            title: item.title?.toString?.() || item.title || 'Unknown Title',
            artist: item.artists?.[0]?.name || fallbackArtistName,
            albumArt: thumbUrl,
            duration: item.duration?.seconds || 0,
            isStreamable: true,
          };
        });
      } catch (err: any) {
        this.logger.debug(`fallback artist search failed: ${err.message}`);
      }
    }

    return [];
  }

  /**
   * Generates 3 personalized algorithmic shelves based on user's onboarding preferences
   */
  async getHomeShelves(userId: string): Promise<RecommendationShelf[]> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new ForbiddenException('User not found');
    }

    if (!user.hasCompletedOnboarding) {
      throw new ForbiddenException('Please complete onboarding first');
    }

    const preferences = user.preferences || {
      languages: [],
      favoriteArtists: [],
    };
    const { languages = [], favoriteArtists = [] } = preferences;

    if (favoriteArtists.length === 0 || languages.length === 0) {
      throw new ForbiddenException(
        'Preferences are empty. Please complete onboarding.',
      );
    }

    // 1. Fetch recent listening history to calculate artist affinities and sonic seeds
    const recentHistory: any[] = await this.historyService
      .getUserHistory(userId)
      .catch(() => []);

    // 2. Compute recency-decayed artist affinity score
    const artistScores = new Map<string, number>();
    recentHistory.forEach((item, idx) => {
      if (item.artist && item.artist !== 'Unknown Artist') {
        // Recency decay bonus: idx=0 (latest) gets +3 bonus points, linearly decaying over 30 tracks
        const recencyBonus = Math.max(
          0,
          3 * (1 - idx / Math.min(recentHistory.length, 30)),
        );
        const current = artistScores.get(item.artist) || 0;
        artistScores.set(item.artist, current + 1 + recencyBonus);
      }
    });

    // 3. Sort by highest affinity score
    const topListenedArtists = Array.from(artistScores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);

    // Shuffle onboarding favorites for base diversity
    const shuffledFavorites = [...favoriteArtists].sort(
      () => 0.5 - Math.random(),
    );

    // Primary anchor artist: prioritize top scored artist from history, else cold-start favorite
    let anchorArtist: { id?: string; name: string } = shuffledFavorites[0];
    if (topListenedArtists.length > 0) {
      const topName = topListenedArtists[0];
      const matchedFav = favoriteArtists.find(
        (a) => a.name.toLowerCase() === topName.toLowerCase(),
      );
      anchorArtist = matchedFav || { name: topName };
    }

    // Select 2 artists for Daily Mix: top listened + second top or diverse favorite
    const artist1: { id?: string; name: string } = anchorArtist;
    const artist2: { id?: string; name: string } =
      topListenedArtists.length > 1
        ? favoriteArtists.find(
            (a) => a.name.toLowerCase() === topListenedArtists[1].toLowerCase(),
          ) || { name: topListenedArtists[1] }
        : shuffledFavorites.find(
            (a) => a.name.toLowerCase() !== artist1.name.toLowerCase(),
          ) || shuffledFavorites[0];

    // Pick 1 random language from user's selection
    const chosenLanguage =
      languages[Math.floor(Math.random() * languages.length)];

    // Identify latest played track with a valid providerTrackId for sonic matching
    const lastPlayedTrack = recentHistory.find(
      (t) => t.providerTrackId && t.title && t.title.trim().length > 0,
    );

    // ── Shelf: "Similar to [Recently Played Track]" ─────────────────────────────
    const fetchRecentTrackShelf =
      async (): Promise<RecommendationShelf | null> => {
        if (!lastPlayedTrack || !lastPlayedTrack.providerTrackId) {
          return null;
        }

        try {
          let related = await this.getRelatedTracks(
            lastPlayedTrack.providerTrackId,
          );

          // Filter out the seed track to prevent duplicating the exact song
          related = related.filter(
            (t) => t.providerTrackId !== lastPlayedTrack.providerTrackId,
          );

          // If fewer than 5 tracks, try supplementing with related tracks from the 2nd recent track
          if (related.length < 5 && recentHistory.length > 1) {
            const secondTrack = recentHistory.find(
              (t, idx) =>
                idx > 0 &&
                t.providerTrackId &&
                t.providerTrackId !== lastPlayedTrack.providerTrackId,
            );
            if (secondTrack?.providerTrackId) {
              const moreRelated = await this.getRelatedTracks(
                secondTrack.providerTrackId,
              );
              const existingIds = new Set(
                related.map((r) => r.providerTrackId),
              );
              existingIds.add(lastPlayedTrack.providerTrackId);
              for (const m of moreRelated) {
                if (!existingIds.has(m.providerTrackId)) {
                  related.push(m);
                  existingIds.add(m.providerTrackId);
                }
              }
            }
          }

          if (related.length === 0) {
            return null;
          }

          const rawTitle = lastPlayedTrack.title.trim();
          const cleanTitle =
            rawTitle.length > 28 ? `${rawTitle.slice(0, 25)}...` : rawTitle;

          return {
            id: 'shelf-recent-vibe',
            title: `Similar to "${cleanTitle}"`,
            description: `Vibes and sonic suggestions inspired by "${cleanTitle}"`,
            type: 'track-list',
            items: related.slice(0, 25),
          };
        } catch (err: any) {
          this.logger.error(
            `Recent track shelf generation failed: ${err.message}`,
          );
          return null;
        }
      };

    // ── Shelf 1: "Your Daily Mix" (Top Listened Artist + Song Suggestions) ──────
    const fetchShelf1 = async (): Promise<RecommendationShelf> => {
      try {
        // Fetch up to 15 top tracks directly by the user's #1 top listened artist
        const topTracksA = await this.getArtistTopTracks(
          artist1.id || '',
          artist1.name,
          15,
        );

        // Fetch related song suggestions based on the top listened artist's signature tracks
        let suggestedTracks: RecommendedTrack[] = [];
        if (topTracksA.length > 0 && topTracksA[0].providerTrackId) {
          suggestedTracks = await this.getRelatedTracks(
            topTracksA[0].providerTrackId,
          );
        }

        // Fetch tracks from secondary favorite artist for harmonic variety
        let tracksB: RecommendedTrack[] = [];
        if (artist2.name.toLowerCase() !== artist1.name.toLowerCase()) {
          tracksB = await this.getArtistTopTracks(
            artist2.id || '',
            artist2.name,
            8,
          );
        }

        // Merge: Top artist tracks + tailored suggestions + secondary artist
        const combined: RecommendedTrack[] = [];
        const seenIds = new Set<string>();

        const addTrack = (t: RecommendedTrack) => {
          if (t && t.providerTrackId && !seenIds.has(t.providerTrackId)) {
            seenIds.add(t.providerTrackId);
            combined.push(t);
          }
        };

        const maxLen = Math.max(
          topTracksA.length,
          suggestedTracks.length,
          tracksB.length,
        );
        for (let i = 0; i < maxLen; i++) {
          if (topTracksA[i]) addTrack(topTracksA[i]);
          if (suggestedTracks[i]) addTrack(suggestedTracks[i]);
          if (tracksB[i]) addTrack(tracksB[i]);
        }

        return {
          id: 'shelf-1',
          title: 'Your Daily Mix',
          description: `Featuring ${artist1.name} and personalized song suggestions`,
          type: 'track-list',
          items: combined.slice(0, 30),
        };
      } catch (err: any) {
        this.logger.error(`Shelf 1 generation failed: ${err.message}`);
        return {
          id: 'shelf-1',
          title: 'Your Daily Mix',
          description: 'Personalized song suggestions',
          type: 'track-list',
          items: [],
        };
      }
    };

    // ── Shelf 2: "Because you listen to [Artist Name]" ─────────────────────────
    const fetchShelf2 = async (): Promise<RecommendationShelf> => {
      try {
        // Fetch top song to use as radio anchor
        const topSongs = await this.getArtistTopTracks(
          anchorArtist.id || '',
          anchorArtist.name,
          1,
        );
        let relatedTracks: RecommendedTrack[] = [];

        if (topSongs.length > 0 && topSongs[0].providerTrackId) {
          relatedTracks = await this.getRelatedTracks(
            topSongs[0].providerTrackId,
          );
        }

        // If related returned few tracks, fallback to artist catalog
        if (relatedTracks.length < 10) {
          const fallbackTracks = await this.getArtistTopTracks(
            anchorArtist.id || '',
            anchorArtist.name,
            15,
          );
          const seen = new Set(relatedTracks.map((r) => r.providerTrackId));
          for (const fb of fallbackTracks) {
            if (!seen.has(fb.providerTrackId)) {
              relatedTracks.push(fb);
              seen.add(fb.providerTrackId);
            }
          }
        }

        return {
          id: 'shelf-2',
          title: `Because you listen to ${anchorArtist.name}`,
          description: `Popular hits and recommendations inspired by ${anchorArtist.name}`,
          type: 'track-list',
          items: relatedTracks.slice(0, 25),
        };
      } catch (err: any) {
        this.logger.error(`Shelf 2 generation failed: ${err.message}`);
        return {
          id: 'shelf-2',
          title: `Because you listen to ${anchorArtist.name}`,
          description: `Inspired by ${anchorArtist.name}`,
          type: 'track-list',
          items: [],
        };
      }
    };

    // ── Shelf 3: "Trending in [Language]" ─────────────────────────────────────
    const fetchShelf3 = async (): Promise<RecommendationShelf> => {
      try {
        const yt = await getClient();
        const searchRes = await yt.music.search(`Top Hits ${chosenLanguage}`, {
          type: 'playlist',
        });
        const playlists = searchRes.playlists?.contents || [];
        const playlistId = playlists[0]?.id;

        let trendingTracks: RecommendedTrack[] = [];

        if (playlistId) {
          try {
            const playlist = await yt.music.getPlaylist(playlistId);
            const items = playlist.items || [];
            trendingTracks = items
              .filter((item: any) => item.id)
              .slice(0, 15)
              .map((item: any): RecommendedTrack => {
                const videoId = item.id;
                const thumbUrl =
                  item.thumbnail?.contents?.[0]?.url ||
                  item.thumbnails?.[0]?.url ||
                  (videoId
                    ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
                    : '');

                const title =
                  item.title?.text ||
                  item.title?.toString?.() ||
                  item.title ||
                  'Unknown Title';
                const artistName =
                  item.artists?.[0]?.name ||
                  item.author?.name ||
                  'Unknown Artist';

                return {
                  provider: 'youtube',
                  providerTrackId: videoId,
                  id: videoId,
                  title,
                  artist: artistName,
                  albumArt: thumbUrl,
                  duration: item.duration?.seconds || 0,
                  isStreamable: true,
                };
              });
          } catch (e: any) {
            this.logger.debug(
              `Playlist load failed for ${playlistId}: ${e.message}`,
            );
          }
        }

        // Fallback if playlist retrieval failed
        if (trendingTracks.length === 0) {
          const songSearch = await yt.music.search(
            `Top ${chosenLanguage} Songs`,
            { type: 'song' },
          );
          const songs = songSearch.songs?.contents || [];
          trendingTracks = songs
            .slice(0, 10)
            .map((item: any): RecommendedTrack => {
              const videoId = item.id;
              return {
                provider: 'youtube',
                providerTrackId: videoId,
                id: videoId,
                title:
                  item.title?.toString?.() || item.title || 'Unknown Title',
                artist: item.artists?.[0]?.name || 'Unknown Artist',
                albumArt:
                  item.thumbnails?.[0]?.url ||
                  `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                duration: item.duration?.seconds || 0,
                isStreamable: true,
              };
            });
        }

        return {
          id: 'shelf-3',
          title: `Trending in ${chosenLanguage}`,
          type: 'track-list',
          items: trendingTracks.slice(0, 10),
        };
      } catch (err: any) {
        this.logger.error(`Shelf 3 generation failed: ${err.message}`);
        return {
          id: 'shelf-3',
          title: `Trending in ${chosenLanguage}`,
          type: 'track-list',
          items: [],
        };
      }
    };

    // Execute all shelf fetchers concurrently with Promise.all
    const [recentShelf, shelf1, shelf2, shelf3] = await Promise.all([
      fetchRecentTrackShelf(),
      fetchShelf1(),
      fetchShelf2(),
      fetchShelf3(),
    ]);

    const shelves: RecommendationShelf[] = [];
    if (shelf1.items.length > 0) shelves.push(shelf1);
    if (recentShelf && recentShelf.items.length > 0) shelves.push(recentShelf);
    if (shelf2.items.length > 0) shelves.push(shelf2);
    if (shelf3.items.length > 0) shelves.push(shelf3);

    return shelves;
  }
}
