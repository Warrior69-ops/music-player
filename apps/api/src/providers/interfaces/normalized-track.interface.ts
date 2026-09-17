export interface NormalizedTrack {
  provider: string;
  providerTrackId: string;
  title: string;
  artist: string;
  artistId?: string;
  album?: string;
  albumId?: string;
  albumArt?: string;
  duration: number;
  releaseDate?: Date;
  genre?: string;
  explicit: boolean;
  audioUrl?: string;
  previewUrl?: string;
  sourceQuality?: string;
  bitrate?: number;
  format?: string;
  isStreamable: boolean;
}
