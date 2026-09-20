import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller(['recommendations', 'api/recommendations'])
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @Get('related')
  async getRelatedTracks(@Query('trackId') trackId: string) {
    if (!trackId) {
      return [];
    }
    return this.recommendationsService.getRelatedTracks(trackId);
  }

  @Get('artists')
  async searchArtists(@Query('q') query: string) {
    if (!query) {
      return [];
    }
    return this.recommendationsService.searchArtists(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('home')
  async getHomeShelves(@Request() req: any) {
    const userId = req.user._id || req.user.id;
    return this.recommendationsService.getHomeShelves(userId);
  }
}
