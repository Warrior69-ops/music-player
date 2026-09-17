import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HistoryService } from './history.service';
import { NormalizedTrack } from '../providers/interfaces/normalized-track.interface';

@UseGuards(JwtAuthGuard)
@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  async getHistory(@Request() req) {
    const data = await this.historyService.getUserHistory(req.user._id);
    return { success: true, data };
  }

  @Post()
  async logHistory(@Request() req, @Body() track: any) {
    await this.historyService.logPlay(req.user._id, track);
    return { success: true };
  }
}
