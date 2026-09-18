import { Controller, Get, Query, Param, BadRequestException, UseGuards, Request as Req, Res } from '@nestjs/common';
import { MusicService } from './music.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Response, Request } from 'express';

import { Readable } from 'node:stream';
import { getClient } from '../scraper/youtubeScraper';
import youtubedl from 'youtube-dl-exec';

interface CachedStream {
  url: string;
  headers: Record<string, string>;
  expiresAt: number;
}

const streamUrlCache = new Map<string, CachedStream>();
const inFlightFetches = new Map<string, Promise<CachedStream | null>>();

// Parallel prefetch: fire up to MAX_PARALLEL yt-dlp processes simultaneously
const MAX_PARALLEL_PREFETCH = 3;
let activePrefetches = 0;

export function queuePrefetch(id: string) {
  if (streamUrlCache.has(id) || inFlightFetches.has(id)) return;
  if (activePrefetches >= MAX_PARALLEL_PREFETCH) return; // don't overload CPU
  activePrefetches++;
  resolveYtDlpStream(id)
    .catch(() => {})
    .finally(() => { activePrefetches--; });
}

async function resolveYtDlpStream(id: string): Promise<CachedStream | null> {
  const existingInFlight = inFlightFetches.get(id);
  if (existingInFlight) {
    return existingInFlight;
  }

  const fetchPromise = (async () => {
    try {
      const urlOutput: any = await (youtubedl as any)(`https://www.youtube.com/watch?v=${id}`, {
        print: 'url,http_headers',
        format: '140/bestaudio/best',
        extractorArgs: 'youtube:player_client=android,web' // FIX for 403s: bypasses strict botguard checks
      });
      const outputStr = typeof urlOutput === 'string' ? urlOutput.trim() : String(urlOutput).trim();
      const lines = outputStr.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const url = lines[0];

      if (url && url.startsWith('http')) {
        let expiresAt = Date.now() + 2 * 60 * 60 * 1000;
        try {
          const urlObj = new URL(url);
          const expireParam = urlObj.searchParams.get('expire');
          if (expireParam) {
            expiresAt = parseInt(expireParam, 10) * 1000 - 5 * 60 * 1000;
          }
        } catch (e) {}

        const headers: Record<string, string> = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
        };

        const headersLine = lines.find((l) => l.startsWith('{'));
        if (headersLine) {
          try {
            // yt-dlp outputs dictionary like {'User-Agent': '...', 'Accept': '...'}
            const matches = headersLine.matchAll(/'([^']+)'\s*:\s*'([^']+)'/g);
            for (const match of matches) {
              headers[match[1]] = match[2];
            }
          } catch (e) {}
        }

        const entry: CachedStream = { url, headers, expiresAt };
        streamUrlCache.set(id, entry);
        return entry;
      }
      return null;
    } catch (e) {
      console.error(`yt-dlp fetch failed for video ${id}:`, e);
      return null;
    } finally {
      inFlightFetches.delete(id);
    }
  })();

  inFlightFetches.set(id, fetchPromise);
  return fetchPromise;
}

@Controller('music')
export class MusicController {
  constructor(private readonly musicService: MusicService) {}

  @Get('search')
  async search(@Query('q') query: string) {
    if (!query) {
      throw new BadRequestException('Query parameter "q" is required');
    }

    const data = await this.musicService.searchTracks(query);
    
    // Background prefetch for top 3 results — parallel, not sequential
    if (data && data.length > 0) {
      // NOTE: field is providerTrackId, not id!
      const topIds = data.slice(0, 3).map((t: any) => t.providerTrackId).filter(Boolean);
      topIds.forEach(id => queuePrefetch(id));
    }
    
    return { success: true, data };
  }

  @Get('track/:provider/:id')
  async getTrack(@Param('provider') provider: string, @Param('id') id: string) {
    const data = await this.musicService.getTrack(provider, id);
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Get('stream/:provider/:id')
  async getStreamUrl(@Param('provider') provider: string, @Param('id') id: string, @Req() req: any) {
    const data = await this.musicService.getStreamUrl(provider, id, req.user._id);
    return { success: true, data };
  }

  @Get('suggest')
  async getSuggestions(@Query('q') query: string) {
    if (!query || query.length < 2) return { success: true, data: [] };
    try {
      const { getClient } = await import('../scraper/youtubeScraper.js');
      const yt = await getClient();
      const sections = await yt.music.getSearchSuggestions(query);

      // Section 0 = text query suggestions (music-specific, e.g. "shape of you slowed")
      // Section 1 = actual song matches (MusicResponsiveListItem with id, title, artists)
      const textSuggestions: Array<{ type: 'query'; text: string }> = [];
      const songSuggestions: Array<{ type: 'song'; id: string; title: string; artist: string }> = [];

      for (const section of sections) {
        if (!section.contents) continue;
        for (const item of section.contents) {
          const anyItem = item as any;
          if (item.type === 'SearchSuggestion') {
            // Plain text suggestion — music context only
            const text = anyItem.suggestion?.toString?.() || anyItem.query || '';
            if (text) textSuggestions.push({ type: 'query', text });
          } else if (item.type === 'MusicResponsiveListItem') {
            // Actual song from YouTube Music
            const id = anyItem.id;
            const title = anyItem.title?.toString?.() || '';
            const artist = anyItem.artists?.map((a: any) => a.name).join(', ') || '';
            if (id && title) songSuggestions.push({ type: 'song', id, title, artist });
          }
        }
      }

      // Return up to 5 text suggestions + up to 4 song suggestions
      const data = [
        ...textSuggestions.slice(0, 5),
        ...songSuggestions.slice(0, 4),
      ];

      // Prefetch the song suggestions so they're instant when clicked
      songSuggestions.slice(0, 3).forEach(s => queuePrefetch(s.id));

      return { success: true, data };
    } catch (e) {
      return { success: true, data: [] };
    }
  }

  @Get('proxy/youtube/:id/prefetch')
  async prefetchYoutubeStream(@Param('id') id: string) {
    if (!id) throw new BadRequestException('Missing YouTube ID');
    queuePrefetch(id);
    return { success: true, message: 'Prefetch initiated' };
  }

  @Get('proxy/youtube/:id')
  async proxyYoutubeStream(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    if (!id) throw new BadRequestException('Missing YouTube ID');

    try {
      let cached = streamUrlCache.get(id);
      if (cached && Date.now() > cached.expiresAt) {
        streamUrlCache.delete(id);
        cached = undefined;
      }

      if (!cached) {
        cached = (await resolveYtDlpStream(id)) || undefined;
      }

      if (!cached || !cached.url) {
        throw new Error('Failed to fetch stream URL');
      }

      const upstreamHeaders: Record<string, string> = { ...cached.headers };

      if (req.headers.range) {
        upstreamHeaders['Range'] = req.headers.range;
      }

      const abortController = new AbortController();
      req.on('close', () => {
        abortController.abort();
      });

      console.log(`[StreamProxy] Request for ${id}, Range: ${req.headers.range}`);
      const upstreamRes = await fetch(cached.url, {
        headers: upstreamHeaders,
        signal: abortController.signal,
      });

      if (!upstreamRes.ok && upstreamRes.status !== 206) {
        console.error(`[StreamProxy] Upstream 403/Error for track ${id}:`, {
          status: upstreamRes.status,
          statusText: upstreamRes.statusText,
          cachedHeaders: cached.headers,
          range: req.headers.range,
          urlDomain: new URL(cached.url).hostname,
        });
        streamUrlCache.delete(id);
        throw new Error(`Upstream returned ${upstreamRes.status}`);
      }

      // Forward response headers securely
      res.status(upstreamRes.status);
      upstreamRes.headers.forEach((value, key) => {
        const lowerKey = key.toLowerCase();
        if (['content-type', 'content-length', 'content-range', 'accept-ranges'].includes(lowerKey)) {
          res.setHeader(lowerKey, value);
        }
      });
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

      if (upstreamRes.body) {
        // @ts-ignore
        const readable = Readable.fromWeb(upstreamRes.body);
        readable.on('error', () => {
          if (!res.headersSent) res.status(500).end();
        });
        readable.pipe(res);
      } else {
        res.end();
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return res.end();
      }
      console.error('Streaming error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      } else {
        res.end();
      }
    }
  }

  @Get('lyrics')
  async getLyrics(
    @Query('track') track: string,
    @Query('artist') artist: string,
    @Query('duration') duration: string,
  ) {
    if (!track || !artist) throw new BadRequestException('track and artist are required');
    const durNum = duration ? parseInt(duration, 10) : undefined;
    const data = await this.musicService.getLyrics(track, artist, durNum);
    return { success: true, data };
  }
}
