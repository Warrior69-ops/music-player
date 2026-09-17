# Music Providers Architecture

## Overview
The application aggregates music data from multiple external providers. To prevent tight coupling, a common interface is used. The backend normalizes all provider-specific responses into a standard `Track` model before sending them to the frontend.

## Provider Interface
Every provider class must implement the `MusicProvider` interface:

```typescript
interface MusicProvider {
  searchTracks(query: string): Promise<NormalizedTrack[]>;
  getTrack(id: string): Promise<NormalizedTrack>;
  getAlbum(id: string): Promise<NormalizedAlbum>;
  getArtist(id: string): Promise<NormalizedArtist>;
  getStreamUrl(id: string): Promise<string>;
  getArtwork(id: string): Promise<string>;
  getCapabilities(): ProviderCapabilities;
}
```

## Normalized Track Model
```typescript
{
  provider: string;
  providerTrackId: string;
  title: string;
  artist: string;
  artistId: string;
  album: string;
  albumId: string;
  albumArt: string;
  duration: number;
  releaseDate: Date;
  genre: string;
  explicit: boolean;
  audioUrl: string;
  previewUrl: string;
  sourceQuality: string;
  bitrate: number;
  format: string;
  isStreamable: boolean;
}
```

## Initial Providers

### 1. Audius
- **Role**: Primary streaming provider.
- **Capabilities**: Audio streaming, track metadata, artist info, playlists, artwork.
- **Integration**: Official Audius API/SDK. Requires `AUDIUS_API_KEY`.

### 2. Jamendo
- **Role**: Secondary music provider (independent music catalog).
- **Capabilities**: Track search, metadata, artwork, audio streaming.
- **Integration**: Jamendo Developer API. Requires `JAMENDO_CLIENT_ID`.

### 3. MusicBrainz
- **Role**: Metadata enrichment.
- **Capabilities**: Detailed artist info, relationships, ISRC, accurate discography.
- **Integration**: MusicBrainz API. No key required, but strict rate-limiting and custom `User-Agent` are mandatory.

### 4. LRCLIB
- **Role**: Lyrics provider.
- **Capabilities**: Plain lyrics, synchronized lyrics.
- **Integration**: LRCLIB API. No key required. Results are cached in MongoDB.

## Aggregation and Search Workflow
1. The user performs a search.
2. The `MusicService` calls `searchTracks` on multiple configured providers concurrently.
3. The raw results are mapped to the `NormalizedTrack` model.
4. Results are deduplicated (preferring matches based on ISRC or exact Title/Artist/Duration combinations).
5. Results are ranked and returned to the client.
