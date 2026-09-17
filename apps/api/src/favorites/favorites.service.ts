import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Favorite } from './schemas/favorite.schema';
import { AddFavoriteDto } from './dto/favorites.dto';

@Injectable()
export class FavoritesService {
  private readonly logger = new Logger(FavoritesService.name);

  constructor(
    @InjectModel(Favorite.name) private favoriteModel: Model<Favorite>,
  ) {}

  async addFavorite(userId: string, dto: AddFavoriteDto): Promise<Favorite> {
    return this.favoriteModel.findOneAndUpdate(
      { userId, provider: dto.provider, providerTrackId: dto.providerTrackId },
      { $set: { ...dto, addedAt: new Date() } },
      { upsert: true, new: true }
    ).exec() as any;
  }

  async removeFavorite(userId: string, providerTrackId: string): Promise<void> {
    await this.favoriteModel.findOneAndDelete({ userId, providerTrackId }).exec();
  }

  async getUserFavorites(userId: string): Promise<Favorite[]> {
    return this.favoriteModel.find({ userId }).sort({ addedAt: -1 }).exec();
  }
}
