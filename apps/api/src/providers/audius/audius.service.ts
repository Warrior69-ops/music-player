import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { MusicProvider } from '../interfaces/music-provider.interface';
import { NormalizedTrack } from '../interfaces/normalized-track.interface';

@Injectable()
export class AudiusService implements MusicProvider {
  private readonly logger = new Logger(AudiusService.name);
  private readonly baseUrl = 'https://discoveryprovider.audius.co/v1';

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  private get headers() {
    const bearer = this.configService.get<string>('AUDIUS_BEARER_TOKEN') || this.configService.get<string>('AUDIUS_API_KEY');
    return {
      Accept: 'application/json',
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    };
  }

  private normalizeTrack(track: any): NormalizedTrack {
    return {
      provider: 'audius',
      providerTrackId: String(track.id),
      title: track.title,
      artist: track.user?.name || 'Unknown Artist',
      artistId: track.user?.id,
      albumArt: track.artwork?.['480x480'] || track.artwork?.['150x150'],
      duration: track.duration,
      releaseDate: new Date(track.release_date),
      genre: track.genre,
      explicit: false,
      audioUrl: `https://discoveryprovider.audius.co/v1/tracks/${track.id}/stream`,
      isStreamable: track.is_streamable,
    };
  }

  async searchTracks(query: string): Promise<NormalizedTrack[]> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/tracks/search`, {
          params: { query, app_name: 'AntigravityMusic' },
          headers: this.headers,
        }),
      );
      return data.data.map((track: any) => this.normalizeTrack(track));
    } catch (error) {
      this.logger.error(`Audius search failed for query: ${query}`, error);
      return [];
    }
  }

  async getTrack(id: string): Promise<NormalizedTrack | null> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/tracks/${id}`, {
          params: { app_name: 'AntigravityMusic' },
          headers: this.headers,
        }),
      );
      return data.data ? this.normalizeTrack(data.data) : null;
    } catch (error) {
      this.logger.error(`Audius getTrack failed for id: ${id}`, error);
      return null;
    }
  }

  async getAlbum(id: string): Promise<any> { return null; }
  async getArtist(id: string): Promise<any> { return null; }
  
  async getStreamUrl(id: string): Promise<string | null> {
    return `${this.baseUrl}/tracks/${id}/stream?app_name=AntigravityMusic`;
  }

  async getArtwork(id: string): Promise<string | null> { return null; }
  
  getCapabilities() {
    return { canStream: true, hasLyrics: false, hasArtwork: true };
  }
}
