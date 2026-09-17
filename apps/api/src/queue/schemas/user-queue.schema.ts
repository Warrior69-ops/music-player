import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { Track } from '../../music/schemas/track.schema';

@Schema({ timestamps: true })
export class UserQueue extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId | User;

  @Prop([{ type: Types.ObjectId, ref: 'Track' }])
  trackIds: Types.ObjectId[] | Track[];

  @Prop({ default: 0 })
  currentIndex: number;
}

export const UserQueueSchema = SchemaFactory.createForClass(UserQueue);
