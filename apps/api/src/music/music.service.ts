import { Injectable, Logger, Inject, BadRequestException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { AudiusService } from '../providers/audius/audius.service';
import { JamendoService } from '../providers/jamendo/jamendo.service';
import { YoutubeService } from '../providers/youtube/youtube.service';
import { LrclibService } from '../providers/lrclib/lrclib.service';
import { HistoryService } from '../history/history.service';
import { NormalizedTrack } from '../providers/interfaces/normalized-track.interface';

@Injectable()
export class MusicService {
  private readonly logger = new Logger(MusicService.name);

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private audiusService: AudiusService,
    private jamendoService: JamendoService,
    private youtubeService: YoutubeService,
    private lrclibService: LrclibService,
    private historyService: HistoryService,
  ) {}

  async searchTracks(query: string): Promise<NormalizedTrack[]> {
    const cacheKey = `search:tracks:${query.toLowerCase().trim()}`;
    const cachedResults = await this.cacheManager.get<NormalizedTrack[]>(cacheKey);
    
    if (cachedResults) {
      this.logger.log(`Cache hit for query: ${query}`);
      return cachedResults;
    }

    this.logger.log(`Cache miss for query: ${query}. Fetching from providers...`);

    const promises = [
      // this.audiusService.searchTracks(query),
      // this.jamendoService.searchTracks(query),
      this.youtubeService.searchTracks(query),
    ];

    const results = await Promise.allSettled(promises);
    
    const aggregatedTracks: NormalizedTrack[] = [];
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        aggregatedTracks.push(...result.value);
      } else {
        this.logger.error('A provider failed during search', result.reason);
      }
    }
    // Filter out tracks that cannot be streamed
    const streamableTracks = aggregatedTracks.filter(track => track.isStreamable && track.audioUrl);

    // Cache the results for 1 hour
    await this.cacheManager.set(cacheKey, streamableTracks);

    return streamableTracks;
  }

  private getProviderService(provider: string) {
    if (provider === 'audius') return this.audiusService;
    if (provider === 'jamendo') return this.jamendoService;
    if (provider === 'youtube') return this.youtubeService;
    throw new BadRequestException('Unsupported provider');
  }

  async getTrack(provider: string, id: string): Promise<NormalizedTrack> {
    const service = this.getProviderService(provider);
    const track = await service.getTrack(id);
    if (!track) throw new BadRequestException('Track not found');
    return track;
  }

  async getStreamUrl(provider: string, id: string, userId: string): Promise<string> {
    const track = await this.getTrack(provider, id);
    const url = await this.getProviderService(provider).getStreamUrl(id);
    if (!url) throw new BadRequestException('Stream URL not found');
    
    // Log to history asynchronously so we don't block playback
    this.historyService.logPlay(userId, track).catch(err => {
      this.logger.error(`Failed to log play history: ${err.message}`);
    });
    
    return url;
  }

  async getLyrics(trackName: string, artistName: string, duration?: number) {
    return this.lrclibService.searchLyrics(trackName, artistName, undefined, duration);
  }
}
