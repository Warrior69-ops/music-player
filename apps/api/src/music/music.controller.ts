import { Controller, Get, Query, Param, BadRequestException, UseGuards, Request as Req, Res } from '@nestjs/common';
import { MusicService } from './music.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Response, Request } from 'express';
import { Readable } from 'node:stream';
import { YtDlpDaemonService } from './ytdlp-daemon.service';

@Controller('music')
export class MusicController {
  constructor(
    private readonly musicService: MusicService,
    private readonly ytDlp: YtDlpDaemonService,
  ) {}

  // ── Endpoints ───────────────────────────────────────────────────────────────

  @Get('search')
  async search(@Query('q') query: string) {
    if (!query) throw new BadRequestException('Query parameter "q" is required');

    const data = await this.musicService.searchTracks(query);

    // Immediately prefetch top 3 results in parallel
    if (data?.length) {
      data.slice(0, 3)
        .map((t: any) => t.providerTrackId)
        .filter(Boolean)
        .forEach((id: string) => this.ytDlp.prefetch(id));
    }

    return { success: true, data };
  }

  @Get('track/:provider/:id')
  async getTrack(@Param('provider') provider: string, @Param('id') id: string) {
    return { success: true, data: await this.musicService.getTrack(provider, id) };
  }

  @UseGuards(JwtAuthGuard)
  @Get('stream/:provider/:id')
  async getStreamUrl(@Param('provider') provider: string, @Param('id') id: string, @Req() req: any) {
    return { success: true, data: await this.musicService.getStreamUrl(provider, id, req.user._id) };
  }

  @Get('suggest')
  async getSuggestions(@Query('q') query: string) {
    if (!query || query.length < 2) return { success: true, data: [] };
    try {
      const { getClient } = await import('../scraper/youtubeScraper.js');
      const yt = await getClient();
      const sections = await yt.music.getSearchSuggestions(query);

      const textSuggestions: Array<{ type: 'query'; text: string }> = [];
      const songSuggestions: Array<{ type: 'song'; id: string; title: string; artist: string }> = [];

      for (const section of sections) {
        if (!section.contents) continue;
        for (const item of section.contents) {
          const anyItem = item as any;
          if (item.type === 'SearchSuggestion') {
            const text = anyItem.suggestion?.toString?.() || anyItem.query || '';
            if (text) textSuggestions.push({ type: 'query', text });
          } else if (item.type === 'MusicResponsiveListItem') {
            const id = anyItem.id;
            const title = anyItem.title?.toString?.() || '';
            const artist = anyItem.artists?.map((a: any) => a.name).join(', ') || '';
            if (id && title) songSuggestions.push({ type: 'song', id, title, artist });
          }
        }
      }

      // Prefetch song suggestions eagerly — user is likely to click one!
      songSuggestions.slice(0, 3).forEach(s => this.ytDlp.prefetch(s.id));

      return {
        success: true,
        data: [...textSuggestions.slice(0, 5), ...songSuggestions.slice(0, 4)],
      };
    } catch {
      return { success: true, data: [] };
    }
  }

  @Get('proxy/youtube/:id/prefetch')
  async prefetchYoutubeStream(@Param('id') id: string) {
    if (!id) throw new BadRequestException('Missing YouTube ID');
    this.ytDlp.prefetch(id);
    return { success: true, message: 'Prefetch initiated' };
  }

  @Get('proxy/youtube/:id')
  async proxyYoutubeStream(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    if (!id) throw new BadRequestException('Missing YouTube ID');

    try {
      // Resolve — instant cache hit if prefetched, otherwise ~3s first time
      const cached = await this.ytDlp.resolve(id);
      if (!cached?.url) throw new Error('Failed to fetch stream URL');

      const upstreamHeaders: Record<string, string> = { ...cached.headers };
      if (req.headers.range) upstreamHeaders['Range'] = req.headers.range;

      const abort = new AbortController();
      req.on('close', () => abort.abort());

      console.log(`[StreamProxy] ${id} | Range: ${req.headers.range ?? 'none'}`);
      const upstreamRes = await fetch(cached.url, { headers: upstreamHeaders, signal: abort.signal });

      if (!upstreamRes.ok && upstreamRes.status !== 206) {
        console.error(`[StreamProxy] Upstream ${upstreamRes.status} for ${id}`, {
          urlDomain: new URL(cached.url).hostname,
        });
        // Evict stale entry and let the next request re-fetch
        this.ytDlp.cache.delete(id);
        throw new Error(`Upstream returned ${upstreamRes.status}`);
      }

      res.status(upstreamRes.status);
      upstreamRes.headers.forEach((value, key) => {
        if (['content-type', 'content-length', 'content-range', 'accept-ranges'].includes(key.toLowerCase())) {
          res.setHeader(key, value);
        }
      });
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

      if (upstreamRes.body) {
        // @ts-ignore
        const readable = Readable.fromWeb(upstreamRes.body);
        readable.on('error', () => { if (!res.headersSent) res.status(500).end(); });
        readable.pipe(res);
      } else {
        res.end();
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return res.end();
      console.error('Streaming error:', err.message);
      if (!res.headersSent) res.status(500).json({ error: err.message });
      else res.end();
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
    return { success: true, data: await this.musicService.getLyrics(track, artist, durNum) };
  }
}
