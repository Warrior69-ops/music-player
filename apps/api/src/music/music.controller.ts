import { Controller, Get, Query, Param, BadRequestException, UseGuards, Request as Req, Res } from '@nestjs/common';
import { MusicService } from './music.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Response, Request } from 'express';

import { Readable } from 'node:stream';
import { getClient } from '../scraper/youtubeScraper';

@Controller('music')
export class MusicController {
  constructor(private readonly musicService: MusicService) {}

  @Get('search')
  async search(@Query('q') query: string) {
    if (!query) {
      throw new BadRequestException('Query parameter "q" is required');
    }

    const data = await this.musicService.searchTracks(query);
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

  @Get('proxy/youtube/:id/prefetch')
  async prefetchYoutubeStream(@Param('id') id: string) {
    if (!id) throw new BadRequestException('Missing YouTube ID');
    // Just hitting this method forces the YoutubeService to resolve and cache the stream URL
    // so that when the user actually hits /proxy/youtube/:id, it's instant.
    await this.musicService.getYoutubeStreamInfo(id);
    return { success: true, message: 'Prefetched' };
  }

  @Get('proxy/youtube/:id')
  async proxyYoutubeStream(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    if (!id) throw new BadRequestException('Missing YouTube ID');

    try {
      const yt = await getClient();
      
      // 1. Get track info natively
      const info = await yt.music.getInfo(id);
      
      // 2. Choose the best audio format - prefer MP4/AAC (itag 140) for universal browser support
      let format;
      try {
        format = info.chooseFormat({
          type: 'audio',
          quality: 'best',
          format: 'mp4'
        });
      } catch {
        format = info.chooseFormat({
          type: 'audio',
          quality: 'best',
          format: 'any'
        });
      }

      // 3. Decipher the signature to get the raw Google Video CDN URL
      const streamUrl = await format.decipher(yt.session.player);

      if (!streamUrl) {
        throw new Error('Failed to decipher streaming URL');
      }

      const totalLength = format.content_length;
      const rangeHeader = req.headers.range;
      
      let start = 0;
      let requestedEnd = totalLength ? totalLength - 1 : undefined;

      if (rangeHeader) {
        const matches = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
        if (matches) {
          start = parseInt(matches[1], 10);
          if (matches[2]) {
            requestedEnd = parseInt(matches[2], 10);
          }
        }
      }

      const isRange = Boolean(rangeHeader && requestedEnd !== undefined && totalLength);
      const mimeType = format.mime_type?.split(';')[0] || 'audio/mp4';

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

      if (isRange && totalLength) {
        const contentLength = requestedEnd! - start + 1;
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${requestedEnd}/${totalLength}`);
        res.setHeader('Content-Length', contentLength.toString());
      } else if (totalLength) {
        res.status(200);
        res.setHeader('Content-Length', totalLength.toString());
        requestedEnd = totalLength - 1;
      } else {
        res.status(200);
      }

      let isAborted = false;
      const abortController = new AbortController();

      req.on('close', () => {
        isAborted = true;
        abortController.abort();
      });

      // Google Video CDN limits single range requests to ~1MB. We use 512KB chunks for instant TTFB.
      const CHUNK_SIZE = 512 * 1024;
      let current = start;
      const finalEnd = requestedEnd !== undefined ? requestedEnd : (totalLength ? totalLength - 1 : current + CHUNK_SIZE);

      while (current <= finalEnd && !isAborted && !res.writableEnded) {
        const chunkEnd = Math.min(current + CHUNK_SIZE - 1, finalEnd);
        
        try {
          const upstreamRes = await fetch(streamUrl, {
            signal: abortController.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
              'Range': `bytes=${current}-${chunkEnd}`
            }
          });

          if (!upstreamRes.ok && upstreamRes.status !== 206) {
            console.error(`Upstream Google CDN error ${upstreamRes.status} for range ${current}-${chunkEnd}`);
            break;
          }

          if (upstreamRes.body) {
            const reader = upstreamRes.body.getReader();
            while (!isAborted && !res.writableEnded) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) {
                const canContinue = res.write(Buffer.from(value));
                if (!canContinue) {
                  await new Promise((resolve) => res.once('drain', resolve));
                }
              }
            }
          }

          current = chunkEnd + 1;
        } catch (err: any) {
          if (err.name === 'AbortError' || isAborted) {
            break;
          }
          console.error('Error streaming chunk from YouTube:', err.message);
          break;
        }
      }

      if (!res.writableEnded) {
        res.end();
      }

    } catch (err: any) {
      console.error('Streaming pipeline error:', err.message);
      if (!res.headersSent) {
        res.status(500).send('Internal streaming proxy error');
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
