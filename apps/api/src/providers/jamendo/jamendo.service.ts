import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { MusicProvider } from '../interfaces/music-provider.interface';
import { NormalizedTrack } from '../interfaces/normalized-track.interface';

@Injectable()
export class JamendoService implements MusicProvider {
  private readonly logger = new Logger(JamendoService.name);
  private readonly baseUrl = 'https://api.jamendo.com/v3.0';
  private readonly clientId: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.clientId = this.configService.get<string>('JAMENDO_CLIENT_ID') || '';
  }

  private normalizeTrack(track: any): NormalizedTrack {
    return {
      provider: 'jamendo',
      providerTrackId: String(track.id),
      title: track.name,
      artist: track.artist_name,
      artistId: track.artist_id,
      album: track.album_name,
      albumId: track.album_id,
      albumArt: track.image,
      duration: track.duration,
      releaseDate: new Date(track.releasedate),
      explicit: false,
      audioUrl: track.audio,
      previewUrl: track.audiodownload,
      isStreamable: true,
    };
  }

  async searchTracks(query: string): Promise<NormalizedTrack[]> {
    if (!this.clientId) return [];
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/tracks/`, {
          params: { client_id: this.clientId, format: 'json', search: query, limit: 10 },
        }),
      );
      return data.results.map((track: any) => this.normalizeTrack(track));
    } catch (error) {
      this.logger.error(`Jamendo search failed for query: ${query}`, error);
      return [];
    }
  }

  async getTrack(id: string): Promise<NormalizedTrack | null> {
    if (!this.clientId) return null;
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/tracks/`, {
          params: { client_id: this.clientId, format: 'json', id },
        }),
      );
      return data.results.length > 0 ? this.normalizeTrack(data.results[0]) : null;
    } catch (error) {
      this.logger.error(`Jamendo getTrack failed for id: ${id}`, error);
      return null;
    }
  }

  async getAlbum(id: string): Promise<any> { return null; }
  async getArtist(id: string): Promise<any> { return null; }
  
  async getStreamUrl(id: string): Promise<string | null> {
    const track = await this.getTrack(id);
    return track ? track.audioUrl || null : null;
  }

  async getArtwork(id: string): Promise<string | null> { return null; }
  
  getCapabilities() {
    return { canStream: true, hasLyrics: false, hasArtwork: true };
  }
}
