import { Controller, Get, Query } from '@nestjs/common';
import { LyricsService } from './lyrics.service';

@Controller('lyrics')
export class LyricsController {
  constructor(private readonly lyricsService: LyricsService) {}

  @Get()
  async getLyrics(
    @Query('title') title: string,
    @Query('artist') artist?: string,
    @Query('duration') duration?: string,
  ) {
    if (!title || !title.trim()) {
      return {
        trackId: '',
        isWordSynced: false,
        isLineSynced: false,
        lyrics: [],
      };
    }
    const durationNum = duration ? parseFloat(duration) : undefined;
    return this.lyricsService.getLyrics(
      title.trim(),
      (artist || '').trim(),
      durationNum,
    );
  }
}
