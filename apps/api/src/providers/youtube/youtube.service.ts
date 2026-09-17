import { Injectable, Logger } from '@nestjs/common';
import { MusicProvider } from '../interfaces/music-provider.interface';
import { NormalizedTrack } from '../interfaces/normalized-track.interface';
import { searchYoutubeTracks, resolveYoutubeAudio } from '../../scraper/ytResolver';

@Injectable()
export class YoutubeService implements MusicProvider {
  private readonly logger = new Logger(YoutubeService.name);

  async searchTracks(query: string): Promise<NormalizedTrack[]> {
    this.logger.log(`Searching YouTube for: ${query}`);
    const results = await searchYoutubeTracks(query, 5);
    
    return results.map(track => ({
      provider: 'youtube',
      providerTrackId: track.id,
      title: track.title,
      artist: track.artist,
      albumArt: track.thumbnail,
      duration: track.duration || 0,
      explicit: false,
      isStreamable: true,
      audioUrl: `/api/music/proxy/youtube/${track.id}` // Frontend will append base API URL
    }));
  }

  async getTrack(id: string): Promise<NormalizedTrack | null> {
    const info = await resolveYoutubeAudio(id);
    if (!info || info.error) return null;
    
    return {
      provider: 'youtube',
      providerTrackId: id,
      title: info.title || 'Unknown Title',
      artist: 'YouTube',
      albumArt: info.thumbnail,
      duration: info.duration || 0,
      explicit: false,
      isStreamable: true,
      audioUrl: `/api/music/proxy/youtube/${id}`
    };
  }

  async getStreamUrl(id: string): Promise<string | null> {
    const info = await resolveYoutubeAudio(id);
    return info.rawStreamUrl || null;
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
