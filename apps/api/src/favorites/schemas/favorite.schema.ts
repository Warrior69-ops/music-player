import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

@Schema({ timestamps: true })
export class Favorite extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId | User;

  @Prop({ required: true })
  providerTrackId: string;

  @Prop({ required: true })
  provider: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  artist: string;

  @Prop()
  albumArt?: string;

  @Prop()
  duration?: number;

  @Prop({ default: Date.now })
  addedAt: Date;
}

export const FavoriteSchema = SchemaFactory.createForClass(Favorite);

// Compound unique index ensuring a user can favorite a track once
FavoriteSchema.index({ userId: 1, providerTrackId: 1 }, { unique: true });
