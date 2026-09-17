import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { MusicProvider } from '../interfaces/music-provider.interface';
import { NormalizedTrack } from '../interfaces/normalized-track.interface';

@Injectable()
export class MusicbrainzService implements MusicProvider {
  private readonly logger = new Logger(MusicbrainzService.name);
  private readonly baseUrl = 'https://musicbrainz.org/ws/2';
  private lastRequestTime = 0;
  
  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  private async throttle() {
    const now = Date.now();
    const timeSinceLast = now - this.lastRequestTime;
    if (timeSinceLast < 1100) {
      await new Promise(resolve => setTimeout(resolve, 1100 - timeSinceLast));
    }
    this.lastRequestTime = Date.now();
  }

  private get headers() {
    const userAgent = this.configService.get<string>('MUSICBRAINZ_USER_AGENT') || 'AntigravityMusic/1.0.0 ( contact@example.com )';
    return {
      'User-Agent': userAgent,
      Accept: 'application/json',
    };
  }

  async searchTracks(query: string): Promise<NormalizedTrack[]> {
    await this.throttle();
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/recording/`, {
          params: { query, fmt: 'json', limit: 5 },
          headers: this.headers,
        }),
      );
      return data.recordings.map((rec: any) => ({
        provider: 'musicbrainz',
        providerTrackId: rec.id,
        title: rec.title,
        artist: rec['artist-credit']?.[0]?.name || 'Unknown',
        duration: rec.length ? Math.floor(rec.length / 1000) : 0,
        explicit: false,
        isStreamable: false,
      }));
    } catch (error) {
      this.logger.error(`MusicBrainz search failed`, error);
      return [];
    }
  }

  async getTrack(id: string): Promise<NormalizedTrack | null> { return null; }
  async getAlbum(id: string): Promise<any> { return null; }
  async getArtist(id: string): Promise<any> { return null; }
  async getStreamUrl(id: string): Promise<string | null> { return null; }
  async getArtwork(id: string): Promise<string | null> { return null; }
  getCapabilities() { return { canStream: false, hasLyrics: false, hasArtwork: false }; }
}
