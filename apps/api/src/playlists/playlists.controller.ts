import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlaylistsService } from './playlists.service';
import { CreatePlaylistDto, UpdatePlaylistDto, AddTrackDto } from './dto/playlists.dto';

@UseGuards(JwtAuthGuard)
@Controller('playlists')
export class PlaylistsController {
  constructor(private readonly playlistsService: PlaylistsService) {}

  @Post()
  async create(@Request() req, @Body() dto: CreatePlaylistDto) {
    const data = await this.playlistsService.createPlaylist(req.user._id, dto);
    return { success: true, data };
  }

  @Get()
  async findAll(@Request() req) {
    const data = await this.playlistsService.getUserPlaylists(req.user._id);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    const data = await this.playlistsService.getPlaylistById(id, req.user._id);
    return { success: true, data };
  }

  @Put(':id')
  async update(@Request() req, @Param('id') id: string, @Body() dto: UpdatePlaylistDto) {
    const data = await this.playlistsService.updatePlaylist(id, req.user._id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    await this.playlistsService.deletePlaylist(id, req.user._id);
    return { success: true, message: 'Playlist deleted' };
  }

  @Post(':id/tracks')
  async addTrack(@Request() req, @Param('id') id: string, @Body() dto: AddTrackDto) {
    const data = await this.playlistsService.addTrackToPlaylist(id, req.user._id, dto);
    return { success: true, data };
  }

  @Delete(':id/tracks/:providerTrackId')
  async removeTrack(@Request() req, @Param('id') id: string, @Param('providerTrackId') providerTrackId: string) {
    const data = await this.playlistsService.removeTrackFromPlaylist(id, req.user._id, providerTrackId);
    return { success: true, data };
  }
}
