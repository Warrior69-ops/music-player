import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FavoritesService } from './favorites.service';
import { AddFavoriteDto } from './dto/favorites.dto';

@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post()
  async addFavorite(@Request() req, @Body() dto: AddFavoriteDto) {
    const data = await this.favoritesService.addFavorite(req.user._id, dto);
    return { success: true, data };
  }

  @Get()
  async getFavorites(@Request() req) {
    const data = await this.favoritesService.getUserFavorites(req.user._id);
    return { success: true, data };
  }

  @Delete(':providerTrackId')
  async removeFavorite(@Request() req, @Param('providerTrackId') providerTrackId: string) {
    await this.favoritesService.removeFavorite(req.user._id, providerTrackId);
    return { success: true, message: 'Track removed from favorites' };
  }
}
