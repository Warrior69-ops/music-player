import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Playlist } from './schemas/playlist.schema';
import { CreatePlaylistDto, UpdatePlaylistDto, AddTrackDto } from './dto/playlists.dto';

@Injectable()
export class PlaylistsService {
  constructor(
    @InjectModel(Playlist.name) private playlistModel: Model<Playlist>,
  ) {}

  async createPlaylist(userId: string, dto: CreatePlaylistDto): Promise<Playlist> {
    return new this.playlistModel({
      userId,
      ...dto,
      tracks: [],
    }).save();
  }

  async getUserPlaylists(userId: string): Promise<Playlist[]> {
    return this.playlistModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async getPlaylistById(id: string, userId: string): Promise<Playlist> {
    const playlist = await this.playlistModel.findById(id).exec();
    if (!playlist) throw new NotFoundException('Playlist not found');
    if (playlist.userId.toString() !== userId.toString() && !playlist.isPublic) {
      throw new UnauthorizedException('Access denied');
    }
    return playlist;
  }

  async updatePlaylist(id: string, userId: string, dto: UpdatePlaylistDto): Promise<Playlist> {
    const playlist = await this.getPlaylistById(id, userId);
    if (playlist.userId.toString() !== userId.toString()) throw new UnauthorizedException();
    
    return this.playlistModel.findByIdAndUpdate(id, dto, { new: true }).exec() as any;
  }

  async deletePlaylist(id: string, userId: string): Promise<void> {
    const playlist = await this.getPlaylistById(id, userId);
    if (playlist.userId.toString() !== userId.toString()) throw new UnauthorizedException();
    await this.playlistModel.findByIdAndDelete(id).exec();
  }

  async addTrackToPlaylist(id: string, userId: string, track: AddTrackDto): Promise<Playlist> {
    const playlist = await this.getPlaylistById(id, userId);
    if (playlist.userId.toString() !== userId.toString()) throw new UnauthorizedException();

    return this.playlistModel.findByIdAndUpdate(
      id,
      { 
        $push: { 
          tracks: { ...track, addedAt: new Date() } 
        } 
      },
      { new: true }
    ).exec() as any;
  }

  async removeTrackFromPlaylist(id: string, userId: string, providerTrackId: string): Promise<Playlist> {
    const playlist = await this.getPlaylistById(id, userId);
    if (playlist.userId.toString() !== userId.toString()) throw new UnauthorizedException();

    return this.playlistModel.findByIdAndUpdate(
      id,
      { $pull: { tracks: { providerTrackId } } },
      { new: true }
    ).exec() as any;
  }
}
