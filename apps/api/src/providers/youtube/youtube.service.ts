import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { MusicProvider } from '../interfaces/music-provider.interface';
import { NormalizedTrack } from '../interfaces/normalized-track.interface';
import {
  searchYoutubeTracks,
  resolveYoutubeTrack,
  YoutubeTrackInfo,
} from '../../scraper/youtubeScraper';

@Injectable()
export class YoutubeService implements MusicProvider {
  private readonly logger = new Logger(YoutubeService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async getRawStreamInfo(id: string): Promise<YoutubeTrackInfo | null> {
    const cacheKey = `youtube:stream:${id}`;
    const cached = await this.cacheManager.get<YoutubeTrackInfo>(cacheKey);

    if (cached) {
      this.logger.log(`Cache hit for YouTube stream: ${id}`);
      return cached;
    }

    this.logger.log(`Extracting raw YouTube stream: ${id}`);
    const info = await resolveYoutubeTrack(id);

    // We don't cache the rawStreamUrl natively with youtubei.js because we pipe the stream directly.
    // However, we cache the metadata so we don't have to fetch it repeatedly.
    if (info && info.success) {
      // Don't cache the client itself because it's a huge object, just the metadata
      const serializableInfo = { ...info, client: undefined };
      await this.cacheManager.set(cacheKey, serializableInfo, 14400000);
    }

    return info;
  }

  async searchTracks(query: string): Promise<NormalizedTrack[]> {
    this.logger.log(`Searching YouTube for: ${query}`);
    const results = await searchYoutubeTracks(query, 5);

    return results.map((track) => ({
      provider: 'youtube',
      providerTrackId: track.id,
      title: track.title,
      artist: track.artist,
      albumArt: track.thumbnail,
      duration: track.duration || 0,
      explicit: false,
      isStreamable: true,
      audioUrl: `/api/music/proxy/youtube/${track.id}`, // Frontend will append base API URL
    }));
  }

  async getTrack(id: string): Promise<NormalizedTrack | null> {
    const info = await this.getRawStreamInfo(id);
    if (!info || !info.success) return null;

    return {
      provider: 'youtube',
      providerTrackId: id,
      title: info.title || 'Unknown Title',
      artist: info.artist || 'YouTube',
      albumArt: info.thumbnail || '',
      duration: info.duration || 0,
      explicit: false,
      isStreamable: true,
      audioUrl: `/api/music/proxy/youtube/${id}`,
    };
  }

  async getStreamUrl(id: string): Promise<string | null> {
    // We proxy it instead
    return `/api/music/proxy/youtube/${id}`;
  }

  async getAlbum(id: string): Promise<any> {
    return null;
  }

  async getArtist(id: string): Promise<any> {
    return null;
  }

  async getArtwork(id: string): Promise<string | null> {
    return null;
  }

  getCapabilities() {
    return {
      canSearch: true,
      canStream: true,
      hasLyrics: false,
    };
  }
}
