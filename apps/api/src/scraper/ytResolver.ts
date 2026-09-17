import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { Logger } from '@nestjs/common';

const execAsync = promisify(exec);
const logger = new Logger('YoutubeScraper');

export interface YoutubeStreamInfo {
  rawStreamUrl: string | null;
  title?: string;
  duration?: number;
  thumbnail?: string;
  error?: string;
}

export interface YoutubeSearchResult {
  id: string;
  title: string;
  duration: number;
  thumbnail: string;
  artist: string;
}

export async function resolveYoutubeAudio(youtubeUrlOrId: string): Promise<YoutubeStreamInfo> {
  const url = youtubeUrlOrId.includes('youtube.com') || youtubeUrlOrId.includes('youtu.be') 
    ? youtubeUrlOrId 
    : `https://www.youtube.com/watch?v=${youtubeUrlOrId}`;

  try {
    // -f "bestaudio/best": Extracts only the highest quality audio stream (Opus/WebM or M4A)
    // --dump-json: Outputs the direct CDN URL and metadata as JSON
    const command = `yt-dlp -f "bestaudio/best" --dump-json "${url}"`;
    const { stdout } = await execAsync(command, { maxBuffer: 1024 * 1024 * 10 });
    
    const audioData = JSON.parse(stdout);
    
    return {
      rawStreamUrl: audioData.url, // The direct googlevideo.com stream
      title: audioData.title,
      duration: audioData.duration,
      thumbnail: audioData.thumbnail
    };
  } catch (err: any) {
    logger.error('Resolver failed:', err.message);
    return { rawStreamUrl: null, error: err.message };
  }
}

export async function searchYoutubeTracks(query: string, limit = 5): Promise<YoutubeSearchResult[]> {
  try {
    const command = `yt-dlp "ytsearch${limit}:${query}" --dump-json`;
    const { stdout } = await execAsync(command, { maxBuffer: 1024 * 1024 * 10 });
    
    const lines = stdout.trim().split('\n');
    const results: YoutubeSearchResult[] = [];
    
    for (const line of lines) {
      if (!line) continue;
      try {
        const data = JSON.parse(line);
        results.push({
          id: data.id,
          title: data.title || data.fulltitle,
          duration: data.duration, // in seconds
          thumbnail: data.thumbnail,
          artist: data.uploader || data.channel || 'YouTube'
        });
      } catch (e) {
        logger.error('Failed to parse yt-dlp search line', e);
      }
    }
    
    return results;
  } catch (err: any) {
    logger.error('Search failed:', err.message);
    return [];
  }
}
