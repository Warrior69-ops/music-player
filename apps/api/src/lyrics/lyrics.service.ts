import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { parseLrc } from './utils/lrc-parser';
import { LyricsPayload } from './interfaces/lyrics.interface';

@Injectable()
export class LyricsService {
  private readonly logger = new Logger(LyricsService.name);

  private cleanMetadata(str: string): string {
    if (!str) return '';
    return str
      .replace(
        /\s*[\(\[](official\s*(music\s*)?video|official\s*audio|video|audio|lyrics?|lyric\s*video|mv|visualizer|remastered|extended|4k|hd|hq)[\)\]]/gi,
        '',
      )
      .replace(/\s*[\(\[](feat\.|ft\.|featuring)[^\)\]]*[\)\]]/gi, '')
      .replace(/\s+(feat\.|ft\.|featuring)\s+.+$/gi, '')
      .split('|')[0]
      .split('•')[0]
      .replace(/[#@]/g, '')
      .trim();
  }

  async getLyrics(
    title: string,
    artist?: string,
    duration?: number,
  ): Promise<LyricsPayload> {
    const rawTitle = title || '';
    const rawArtist = artist || '';
    const cleanT = this.cleanMetadata(rawTitle);
    const cleanA = this.cleanMetadata(rawArtist);
    const trackId = `${rawTitle}-${rawArtist}`;

    // Generate candidate search queries
    const queryCandidates: string[] = [];

    // If title contains "Artist - Title", separate them
    if (cleanT.includes(' - ')) {
      const parts = cleanT.split(' - ');
      const p1 = parts[0].trim();
      const p2 = parts[1].trim();
      queryCandidates.push(`${p2} ${p1}`); // "Song Artist"
      queryCandidates.push(`${p1} ${p2}`); // "Artist Song"
      queryCandidates.push(p2); // "Song"
      queryCandidates.push(p1); // "Artist"
    }

    const isGenericArtist =
      !cleanA ||
      ['youtube', 'unknown artist', 'various artists'].includes(
        cleanA.toLowerCase(),
      );

    if (!isGenericArtist) {
      queryCandidates.push(`${cleanT} ${cleanA}`);
      queryCandidates.push(cleanT);
    } else {
      queryCandidates.push(cleanT);
    }

    const uniqueQueries = Array.from(
      new Set(queryCandidates.filter((q) => q && q.length > 1)),
    );

    // 1. First attempt: Direct /api/get if clean title & artist are distinct
    if (cleanT && cleanA && !isGenericArtist) {
      try {
        const response = await axios.get('https://lrclib.net/api/get', {
          params: {
            track_name: cleanT,
            artist_name: cleanA,
            duration: duration ? Math.round(duration) : undefined,
          },
          timeout: 3000,
          headers: {
            'Lrclib-Client':
              'MusicPlayer (https://github.com/VED/music-player)',
          },
        });
        if (response.data) {
          const payload = this.processLrclibResponse(response.data, trackId);
          if (payload.lyrics.length > 0) return payload;
        }
      } catch (error) {
        // 404 is normal for inexact track names, continue to search
      }
    }

    // 2. Second attempt: Search across generated query candidates
    for (const q of uniqueQueries) {
      try {
        const response = await axios.get('https://lrclib.net/api/search', {
          params: { q },
          timeout: 3500,
          headers: {
            'Lrclib-Client':
              'MusicPlayer (https://github.com/VED/music-player)',
          },
        });

        const items: any[] = response.data;
        if (items && items.length > 0) {
          // Sort items:
          // 1. prefer items with syncedLyrics
          // 2. if duration is provided, prefer item with closest duration
          // 3. prefer items where artistName matches cleanA or part of cleanT
          const sorted = [...items].sort((a, b) => {
            if (a.syncedLyrics && !b.syncedLyrics) return -1;
            if (!a.syncedLyrics && b.syncedLyrics) return 1;

            if (duration && a.duration && b.duration) {
              const diffA = Math.abs(a.duration - duration);
              const diffB = Math.abs(b.duration - duration);
              if (Math.abs(diffA - diffB) > 3) return diffA - diffB;
            }

            if (!isGenericArtist) {
              const aArtistMatch = a.artistName
                ?.toLowerCase()
                .includes(cleanA.toLowerCase());
              const bArtistMatch = b.artistName
                ?.toLowerCase()
                .includes(cleanA.toLowerCase());
              if (aArtistMatch && !bArtistMatch) return -1;
              if (!aArtistMatch && bArtistMatch) return 1;
            }

            return 0;
          });

          const best = sorted[0];
          if (best && (best.syncedLyrics || best.plainLyrics)) {
            const payload = this.processLrclibResponse(best, trackId);
            if (payload.lyrics.length > 0) return payload;
          }
        }
      } catch (error: any) {
        this.logger.debug(
          `LRCLIB search query failed for "${q}": ${error.message}`,
        );
      }
    }

    return { trackId, isWordSynced: false, isLineSynced: false, lyrics: [] };
  }

  private processLrclibResponse(data: any, trackId: string): LyricsPayload {
    if (data.syncedLyrics) {
      const { lyrics, isWordSynced } = parseLrc(data.syncedLyrics);
      return {
        trackId,
        isWordSynced,
        isLineSynced: true,
        lyrics,
      };
    }

    if (data.plainLyrics) {
      const lines = data.plainLyrics
        .split('\n')
        .map((text: string) => text.trim())
        .filter((text: string) => text.length > 0)
        .map((text: string) => ({
          text,
          start: 0,
          end: 0,
        }));

      return {
        trackId,
        isWordSynced: false,
        isLineSynced: false,
        lyrics: lines,
      };
    }

    return { trackId, isWordSynced: false, isLineSynced: false, lyrics: [] };
  }
}
