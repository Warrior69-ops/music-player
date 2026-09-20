import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FavoritesService } from './favorites.service';
import { AddFavoriteDto } from './dto/favorites.dto';

@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post()
  async addFavorite(@Request() req, @Body() dto: AddFavoriteDto) {
    const userId = req.user._id || req.user.id;
    const data = await this.favoritesService.addFavorite(userId, dto);
    return { success: true, data };
  }

  @Get()
  async getFavorites(@Request() req) {
    const userId = req.user._id || req.user.id;
    const data = await this.favoritesService.getUserFavorites(userId);
    return { success: true, data };
  }

  @Delete(':providerTrackId')
  async removeFavorite(
    @Request() req,
    @Param('providerTrackId') providerTrackId: string,
  ) {
    const userId = req.user._id || req.user.id;
    await this.favoritesService.removeFavorite(userId, providerTrackId);
    return { success: true, message: 'Track removed from favorites' };
  }
}
