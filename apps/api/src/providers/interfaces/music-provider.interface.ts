import { NormalizedTrack } from './normalized-track.interface';

export interface MusicProvider {
  searchTracks(query: string): Promise<NormalizedTrack[]>;
  getTrack(id: string): Promise<NormalizedTrack | null>;
  getAlbum(id: string): Promise<any>;
  getArtist(id: string): Promise<any>;
  getStreamUrl(id: string): Promise<string | null>;
  getArtwork(id: string): Promise<string | null>;
  getCapabilities(): any;
}
