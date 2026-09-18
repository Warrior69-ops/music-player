import { Controller, Get, Query } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';

@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get('related')
  async getRelatedTracks(@Query('trackId') trackId: string) {
    if (!trackId) {
      return [];
    }
    return this.recommendationsService.getRelatedTracks(trackId);
  }
}
