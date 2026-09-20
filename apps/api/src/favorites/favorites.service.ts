import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Favorite } from './schemas/favorite.schema';
import { AddFavoriteDto } from './dto/favorites.dto';

@Injectable()
export class FavoritesService implements OnModuleInit {
  private readonly logger = new Logger(FavoritesService.name);

  constructor(
    @InjectModel(Favorite.name) private favoriteModel: Model<Favorite>,
  ) {}

  async onModuleInit() {
    try {
      // Safely drop obsolete index from previous schema version if it exists
      await this.favoriteModel.collection.dropIndex('userId_1_trackId_1');
      this.logger.log(
        'Dropped legacy userId_1_trackId_1 index from favorites collection',
      );
    } catch (e: any) {
      // Ignore if index does not exist
      this.logger.debug(`Legacy index cleanup: ${e.message}`);
    }
  }

  async addFavorite(userId: string, dto: AddFavoriteDto): Promise<Favorite> {
    return this.favoriteModel
      .findOneAndUpdate(
        { userId, providerTrackId: dto.providerTrackId },
        {
          $set: {
            userId,
            provider: dto.provider,
            providerTrackId: dto.providerTrackId,
            title: dto.title,
            artist: dto.artist,
            albumArt: dto.albumArt,
            duration: dto.duration,
            addedAt: new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  async removeFavorite(userId: string, providerTrackId: string): Promise<void> {
    await this.favoriteModel
      .findOneAndDelete({ userId, providerTrackId })
      .exec();
  }

  async getUserFavorites(userId: string): Promise<Favorite[]> {
    return this.favoriteModel.find({ userId }).sort({ addedAt: -1 }).exec();
  }
}
