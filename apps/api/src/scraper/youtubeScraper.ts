import { Innertube, UniversalCache, Platform } from 'youtubei.js';
import { Logger } from '@nestjs/common';

const logger = new Logger('YoutubeScraper');

// Inject JS evaluator for YouTube's signature deciphering
Platform.shim.eval = (data) => {
  const code = typeof data === 'string' ? data : (data as any).output || data;
  return Promise.resolve(new Function(code)());
};

let innertubeClient: Innertube | null = null;

/**
 * Reusable singleton instance of InnerTube
 */
export async function getClient(): Promise<Innertube> {
  if (!innertubeClient) {
    logger.log('Initializing youtubei.js InnerTube client...');
    innertubeClient = await Innertube.create({
      cache: new UniversalCache(false),
      generate_session_locally: true
    });
  }
  return innertubeClient;
}

export interface YoutubeSearchResult {
  id: string;
  title: string;
  duration: number;
  thumbnail: string;
  artist: string;
}

export interface YoutubeTrackInfo {
  success: boolean;
  videoId?: string;
  title?: string;
  artist?: string;
  duration?: number;
  thumbnail?: string;
  client?: Innertube;
  error?: string;
}

/**
 * Resolves a track query or YouTube URL into playable metadata and an active download stream
 */
export async function resolveYoutubeTrack(queryOrUrl: string): Promise<YoutubeTrackInfo> {
  try {
    const yt = await getClient();
    let videoId = queryOrUrl;

    // 1. Extract video ID if a URL was passed
    if (queryOrUrl.includes('youtube.com') || queryOrUrl.includes('youtu.be')) {
      const urlObj = new URL(queryOrUrl);
      videoId = urlObj.searchParams.get('v') || queryOrUrl.split('/').pop() || queryOrUrl;
    } 
    // 2. Otherwise search YouTube Music catalog directly
    else if (videoId.length !== 11) {
      logger.log(`Searching youtubei.js for: ${queryOrUrl}`);
      const searchResults = await yt.music.search(queryOrUrl, { type: 'song' });
      const firstSong = searchResults.songs?.contents?.[0];
      if (!firstSong || !firstSong.id) {
        throw new Error(`No matching track found for: ${queryOrUrl}`);
      }
      videoId = firstSong.id;
    }

    // 3. Fetch track playback details and metadata
    const info = await yt.music.getInfo(videoId);
    const basic = info.basic_info;

    return {
      success: true,
      videoId,
      title: basic.title,
      artist: basic.author,
      duration: basic.duration,
      thumbnail: basic.thumbnail?.[0]?.url,
      client: yt
    };
  } catch (err: any) {
    logger.error('youtubei.js resolver error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Native Search functionality replicating yt-search
 */
export async function searchYoutubeTracks(query: string, limit = 10): Promise<YoutubeSearchResult[]> {
  try {
    const yt = await getClient();
    logger.log(`Searching via youtubei.js (music): ${query}`);
    
    // We use YouTube Music search to only index songs, filtering out vlogs, documentaries, etc.
    const search = await yt.music.search(query, { type: 'song' });
    
    // Extract songs from the search results
    const songs = search.songs?.contents || [];
    const limitedSongs = songs.slice(0, limit);
    
    return limitedSongs.map((v: any) => ({
      id: v.id,
      title: v.title,
      duration: v.duration?.seconds || 0,
      thumbnail: v.thumbnails?.[0]?.url || '',
      artist: v.artists?.[0]?.name || 'Unknown Artist'
    }));
  } catch (err: any) {
    logger.error('youtubei.js music search failed:', err.message);
    return [];
  }
}
