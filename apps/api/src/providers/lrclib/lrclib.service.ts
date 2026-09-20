import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class LrclibService {
  private readonly logger = new Logger(LrclibService.name);
  private readonly baseUrl = 'https://lrclib.net/api';

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  async searchLyrics(
    trackName: string,
    artistName: string,
    albumName?: string,
    duration?: number,
  ): Promise<any> {
    try {
      const userAgent =
        this.configService.get<string>('LRCLIB_USER_AGENT') ||
        'LRCGET v0.2.0 (https://github.com/tranxuanthang/lrcget)';
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/get`, {
          params: {
            track_name: trackName,
            artist_name: artistName,
            album_name: albumName,
            duration,
          },
          headers: {
            'Lrclib-Client': userAgent,
          },
        }),
      );
      return data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      this.logger.error(`LRCLIB search failed`, error);
      return null;
    }
  }
}
