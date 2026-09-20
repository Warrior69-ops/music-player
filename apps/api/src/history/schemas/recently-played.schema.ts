import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Track } from '../../music/schemas/track.schema';

@Schema({ timestamps: false })
export class RecentlyPlayed extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId | User;

  @Prop({ required: true })
  providerTrackId: string;

  @Prop({ required: true })
  provider: string;

  @Prop()
  title: string;

  @Prop()
  artist: string;

  @Prop()
  albumArt: string;

  @Prop()
  duration: number;

  @Prop({ required: true, default: Date.now })
  playedAt: Date;

  @Prop({ default: 0 })
  playbackPosition: number;

  @Prop({ default: 1 })
  playCount: number;
}

export const RecentlyPlayedSchema =
  SchemaFactory.createForClass(RecentlyPlayed);
