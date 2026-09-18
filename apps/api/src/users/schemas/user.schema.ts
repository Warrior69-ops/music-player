import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop()
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  passwordHash: string;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop()
  avatarUrl: string;

  @Prop({ default: false })
  hasCompletedOnboarding: boolean;

  @Prop({
    type: {
      languages: [{ type: String }],
      favoriteArtists: [
        {
          id: { type: String },
          name: { type: String },
          thumbnail: { type: String },
        },
      ],
    },
    default: { languages: [], favoriteArtists: [] },
  })
  preferences: {
    languages: string[];
    favoriteArtists: { id: string; name: string; thumbnail: string }[];
  };

  @Prop()
  lastLoginAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
