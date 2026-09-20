import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RecentlyPlayed } from './schemas/recently-played.schema';
import { NormalizedTrack } from '../providers/interfaces/normalized-track.interface';

@Injectable()
export class HistoryService {
  private readonly logger = new Logger(HistoryService.name);

  constructor(
    @InjectModel(RecentlyPlayed.name)
    private historyModel: Model<RecentlyPlayed>,
  ) {}

  async logPlay(
    userId: string | Types.ObjectId,
    track: NormalizedTrack,
  ): Promise<void> {
    try {
      await this.historyModel.findOneAndUpdate(
        {
          userId,
          provider: track.provider,
          providerTrackId: track.providerTrackId,
        },
        {
          $set: {
            title: track.title,
            artist: track.artist,
            albumArt: track.albumArt,
            duration: track.duration,
            playedAt: new Date(),
          },
          $inc: { playCount: 1 },
        },
        { upsert: true, new: true },
      );
    } catch (error) {
      this.logger.error(`Failed to log play history for user ${userId}`, error);
    }
  }

  async getUserHistory(userId: string): Promise<RecentlyPlayed[]> {
    return this.historyModel
      .find({ userId })
      .sort({ playedAt: -1 })
      .limit(50)
      .exec();
  }

  async getUserStats(userId: string) {
    const history = await this.historyModel
      .find({ userId })
      .sort({ playedAt: -1 })
      .exec();

    const totalTracks = history.length;
    let totalPlays = 0;
    let totalSeconds = 0;
    const artistCounts: Record<
      string,
      {
        name: string;
        plays: number;
        minutesStreamed: number;
        thumbnail?: string;
      }
    > = {};

    const historyWithMinutes = history.map((item) => {
      const plays = item.playCount || 1;
      const durationSec = item.duration || 180;
      const streamedSeconds = durationSec * plays;
      const minutesStreamed = Math.max(1, Math.round(streamedSeconds / 60));

      totalPlays += plays;
      totalSeconds += streamedSeconds;

      const artistName = item.artist || 'Unknown Artist';
      if (!artistCounts[artistName]) {
        artistCounts[artistName] = {
          name: artistName,
          plays: 0,
          minutesStreamed: 0,
          thumbnail: item.albumArt,
        };
      }
      artistCounts[artistName].plays += plays;
      artistCounts[artistName].minutesStreamed += minutesStreamed;
      if (item.albumArt && !artistCounts[artistName].thumbnail) {
        artistCounts[artistName].thumbnail = item.albumArt;
      }

      const itemObj = (item as any).toObject ? (item as any).toObject() : item;
      return {
        ...itemObj,
        playCount: plays,
        minutesStreamed,
        totalSecondsStreamed: streamedSeconds,
      };
    });

    // Top tracks of all time calculated and sorted by total minutes streamed
    const topTracks = [...historyWithMinutes]
      .sort((a, b) => b.totalSecondsStreamed - a.totalSecondsStreamed)
      .slice(0, 10);

    const topArtists = Object.values(artistCounts)
      .sort(
        (a, b) => b.minutesStreamed - a.minutesStreamed || b.plays - a.plays,
      )
      .slice(0, 5);

    const totalMinutes = Math.round(totalSeconds / 60);

    let personaTitle = 'Cosmic Nocturne Explorer';
    let personaDesc =
      'Curator of serene evening soundscapes and midnight reverie.';
    if (totalPlays > 50) {
      personaTitle = 'Sonic Virtuoso';
      personaDesc =
        'An insatiable music lover whose soundtrack powers every waking moment.';
    } else if (totalMinutes > 180) {
      personaTitle = 'Deep Focus Voyager';
      personaDesc =
        'Diving deep into extended acoustic journeys and uninterrupted rhythm.';
    } else if (topArtists.length > 0) {
      personaTitle = `${topArtists[0].name} Devotee`;
      personaDesc = `Your repeat button knows no bounds when ${topArtists[0].name} takes the stage.`;
    }

    return {
      totalTracks,
      totalPlays,
      totalMinutes,
      totalHours: (totalMinutes / 60).toFixed(1),
      topTracks,
      topArtists,
      persona: {
        title: personaTitle,
        description: personaDesc,
      },
    };
  }
}
