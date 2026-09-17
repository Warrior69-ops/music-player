import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ProvidersModule } from '../providers/providers.module';
import { HistoryModule } from '../history/history.module';
import { MusicService } from './music.service';
import { MusicController } from './music.controller';

@Module({
  imports: [
    ProvidersModule,
    HistoryModule,
    CacheModule.register({
      ttl: 3600000, // 1 hour in ms
    }),
  ],
  providers: [MusicService],
  controllers: [MusicController],
  exports: [MusicService],
})
export class MusicModule {}
