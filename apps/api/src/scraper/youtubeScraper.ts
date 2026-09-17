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
export async function searchYoutubeTracks(query: string, limit = 5): Promise<YoutubeSearchResult[]> {
  try {
    const yt = await getClient();
    logger.log(`Searching via youtubei.js: ${query}`);
    
    // We use the standard search instead of music search to mirror previous behavior
    // which captured standard videos like covers, live performances, etc.
    const search = await yt.search(query, { type: 'video' });
    
    const videos = search.videos.slice(0, limit);
    
    return videos.map((v: any) => ({
      id: v.id,
      title: v.title.text,
      duration: v.duration?.seconds || 0,
      thumbnail: v.best_thumbnail?.url || '',
      artist: v.author?.name || 'YouTube'
    }));
  } catch (err: any) {
    logger.error('youtubei.js search failed:', err.message);
    return [];
  }
}
