import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';

@Schema({ timestamps: true })
export class UserPreferences extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId | User;

  @Prop({ default: 'dark' })
  theme: string;

  @Prop({ default: 'en' })
  language: string;

  @Prop({ default: true })
  autoplay: boolean;

  @Prop({ default: false })
  crossfade: boolean;

  @Prop({ default: true })
  explicitContent: boolean;

  @Prop({ default: 'high' })
  preferredQuality: string;
}

export const UserPreferencesSchema = SchemaFactory.createForClass(UserPreferences);
