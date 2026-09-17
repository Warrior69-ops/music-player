import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class UserSession extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId | User;

  @Prop({ required: true })
  tokenHash: string;

  @Prop({ required: true, expires: 604800 }) // 7 days TTL
  expiresAt: Date;

  @Prop({ default: Date.now })
  lastUsedAt: Date;
}

export const UserSessionSchema = SchemaFactory.createForClass(UserSession);
