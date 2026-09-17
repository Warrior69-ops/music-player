import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Track } from '../../music/schemas/track.schema';

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Favorite extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId | User;

  @Prop({ type: Types.ObjectId, ref: 'Track', required: true })
  trackId: Types.ObjectId | Track;
}

export const FavoriteSchema = SchemaFactory.createForClass(Favorite);

// Unique compound index so a user can only favorite a track once
FavoriteSchema.index({ userId: 1, trackId: 1 }, { unique: true });
