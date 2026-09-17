import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class PasswordResetSession extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId | User;

  @Prop({ required: true })
  tokenHash: string;

  @Prop({ required: true, expires: 900 }) // 15 minutes TTL
  expiresAt: Date;

  @Prop({ default: false })
  used: boolean;
}

export const PasswordResetSessionSchema = SchemaFactory.createForClass(PasswordResetSession);
