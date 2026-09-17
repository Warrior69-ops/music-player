import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RecentlyPlayed } from './schemas/recently-played.schema';
import { NormalizedTrack } from '../providers/interfaces/normalized-track.interface';

@Injectable()
export class HistoryService {
  private readonly logger = new Logger(HistoryService.name);

  constructor(
    @InjectModel(RecentlyPlayed.name) private historyModel: Model<RecentlyPlayed>,
  ) {}

  async logPlay(userId: string | Types.ObjectId, track: NormalizedTrack): Promise<void> {
    try {
      await this.historyModel.findOneAndUpdate(
        { userId, provider: track.provider, providerTrackId: track.providerTrackId },
        { 
          $set: {
            title: track.title,
            artist: track.artist,
            albumArt: track.albumArt,
            duration: track.duration,
            playedAt: new Date(),
          }
        },
        { upsert: true, new: true }
      );
    } catch (error) {
      this.logger.error(`Failed to log play history for user ${userId}`, error);
    }
  }

  async getUserHistory(userId: string): Promise<RecentlyPlayed[]> {
    return this.historyModel.find({ userId }).sort({ playedAt: -1 }).limit(50).exec();
  }
}
