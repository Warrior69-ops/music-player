import { Controller, Get, Query, Param, BadRequestException, UseGuards, Request as Req, Res } from '@nestjs/common';
import { MusicService } from './music.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Response, Request } from 'express';
import { resolveYoutubeAudio } from '../scraper/ytResolver';
import { Readable } from 'node:stream';

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

  @Get('proxy/youtube/:id')
  async proxyYoutubeStream(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    if (!id) throw new BadRequestException('Missing YouTube ID');

    // 1. Run the resolver to get the direct audio CDN URL
    const streamInfo = await resolveYoutubeAudio(id);
    if (!streamInfo || !streamInfo.rawStreamUrl) {
      return res.status(500).send('Failed to extract audio stream');
    }

    try {
      const abortController = new AbortController();
      
      // Safely destroy the upstream socket if the user skips the song or closes the player
      req.on('close', () => {
        abortController.abort();
      });

      // 2. Fetch the raw audio stream from YouTube's edge servers
      const upstreamRes = await fetch(streamInfo.rawStreamUrl, {
        signal: abortController.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          // Pass the range header from the frontend player to enable seeking
          'Range': req.headers.range || 'bytes=0-'
        }
      });

      // 3. Mirror the upstream headers to bypass CORS and support chunked streaming
      res.status(upstreamRes.status);
      res.setHeader('Content-Type', upstreamRes.headers.get('content-type') || 'audio/webm');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Accept-Ranges', 'bytes');
      
      const contentLength = upstreamRes.headers.get('content-length');
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }
      
      const contentRange = upstreamRes.headers.get('content-range');
      if (contentRange) {
        res.setHeader('Content-Range', contentRange);
      }

      if (!upstreamRes.body) {
        throw new Error('No body in upstream response');
      }

      // 4. Pipe the raw binary audio data directly to the client
      const nodeStream = Readable.fromWeb(upstreamRes.body as any);
      nodeStream.pipe(res);
      
      req.on('close', () => {
        nodeStream.destroy();
      });

    } catch (err: any) {
      if (!res.headersSent) res.status(500).send('Streaming error');
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
