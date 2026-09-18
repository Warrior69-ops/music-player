import { Module } from '@nestjs/common';
import { LyricsService } from './lyrics.service';
import { LyricsController } from './lyrics.controller';

@Module({
  controllers: [LyricsController],
  providers: [LyricsService],
})
export class LyricsModule {}
