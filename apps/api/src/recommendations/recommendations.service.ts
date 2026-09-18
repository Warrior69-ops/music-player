import { Injectable, Logger } from '@nestjs/common';
import { getClient } from '../scraper/youtubeScraper';

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

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

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
          this.logger.debug(`music.getUpNext failed for ${trackId}: ${e.message}`);
        }
      }

      // 2. Secondary fallback: Use standard InnerTube getUpNext
      if (contents.length === 0 && typeof (yt as any).getUpNext === 'function') {
        try {
          const upNext = await (yt as any).getUpNext(trackId);
          if (upNext.contents && upNext.contents.length > 0) {
            contents = upNext.contents;
          }
        } catch (e: any) {
          this.logger.debug(`client.getUpNext failed for ${trackId}: ${e.message}`);
        }
      }

      if (contents.length === 0) {
        return [];
      }

      // Filter out the requested track itself (usually index 0)
      const tracks = contents
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

          const title = item.title?.toString?.() || item.title || 'Unknown Title';
          const duration = item.duration?.seconds || 0;

          return {
            provider: 'youtube',
            providerTrackId: videoId,
            id: videoId,
            title,
            artist: typeof artistName === 'string' ? artistName : 'Unknown Artist',
            albumArt: thumbUrl,
            duration,
            isStreamable: true,
          };
        });

      return tracks;
    } catch (err: any) {
      this.logger.error(`Autoplay fetch failed for ${trackId}: ${err.message}`);
      return [];
    }
  }
}
