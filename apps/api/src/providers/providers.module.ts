import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

import { AudiusService } from './audius/audius.service';
import { JamendoService } from './jamendo/jamendo.service';
import { MusicbrainzService } from './musicbrainz/musicbrainz.service';
import { LrclibService } from './lrclib/lrclib.service';

import { YoutubeService } from './youtube/youtube.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [
    AudiusService,
    JamendoService,
    MusicbrainzService,
    LrclibService,
    YoutubeService,
  ],
  exports: [
    AudiusService,
    JamendoService,
    MusicbrainzService,
    LrclibService,
    YoutubeService,
  ],
})
export class ProvidersModule {}
