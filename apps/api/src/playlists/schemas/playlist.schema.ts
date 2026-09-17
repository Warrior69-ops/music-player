import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Track } from '../../music/schemas/track.schema';

@Schema({ timestamps: true })
export class Playlist extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId | User;

  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop()
  coverImage: string;

  @Prop({ default: false })
  isPublic: boolean;

  @Prop([{ type: Types.ObjectId, ref: 'Track' }])
  tracks: Types.ObjectId[] | Track[];
}

export const PlaylistSchema = SchemaFactory.createForClass(Playlist);
