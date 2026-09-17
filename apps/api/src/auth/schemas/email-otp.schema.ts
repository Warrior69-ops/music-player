import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum OtpType {
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  PASSWORD_RESET = 'PASSWORD_RESET',
}

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class EmailOTP extends Document {
  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  otpHash: string;

  @Prop({ required: true, enum: OtpType })
  type: OtpType;

  @Prop({ required: true, expires: 600 }) // 10 minutes TTL index (600 seconds)
  expiresAt: Date;

  @Prop({ default: 0 })
  attempts: number;
}

export const EmailOTPSchema = SchemaFactory.createForClass(EmailOTP);
