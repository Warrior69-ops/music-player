import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class Track extends Document {
  @Prop({ required: true })
  provider: string;

  @Prop({ required: true })
  providerTrackId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  artist: string;

  @Prop()
  artistId: string;

  @Prop()
  album: string;

  @Prop()
  albumId: string;

  @Prop()
  albumArt: string;

  @Prop({ required: true })
  duration: number;

  @Prop()
  releaseDate: Date;

  @Prop()
  genre: string;

  @Prop({ default: false })
  explicit: boolean;

  @Prop()
  audioUrl: string;

  @Prop()
  previewUrl: string;

  @Prop()
  sourceQuality: string;

  @Prop()
  bitrate: number;

  @Prop()
  format: string;

  @Prop({ default: true })
  isStreamable: boolean;

  @Prop({ default: false })
  lyricsAvailable: boolean;

  @Prop({ type: MongooseSchema.Types.Mixed })
  metadata: any;
}

export const TrackSchema = SchemaFactory.createForClass(Track);

// Unique compound index
TrackSchema.index({ provider: 1, providerTrackId: 1 }, { unique: true });
