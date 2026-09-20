import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HistoryService } from './history.service';
import {
  RecentlyPlayed,
  RecentlyPlayedSchema,
} from './schemas/recently-played.schema';

import { HistoryController } from './history.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RecentlyPlayed.name, schema: RecentlyPlayedSchema },
    ]),
  ],
  providers: [HistoryService],
  controllers: [HistoryController],
  exports: [HistoryService],
})
export class HistoryModule {}
