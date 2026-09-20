import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from './schemas/user.schema';
import { UserPreferences } from './schemas/user-preferences.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(UserPreferences.name)
    private prefsModel: Model<UserPreferences>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findById(id: string | Types.ObjectId): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = new this.userModel(userData);
    const savedUser = await user.save();

    // Create default preferences
    await new this.prefsModel({ userId: savedUser._id }).save();

    return savedUser;
  }

  async update(
    id: string | Types.ObjectId,
    updateData: Partial<User>,
  ): Promise<User | null> {
    return this.userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
  }

  async updateMusicPreferences(
    id: string | Types.ObjectId,
    preferences: {
      languages: string[];
      favoriteArtists: { id: string; name: string; thumbnail: string }[];
    },
  ): Promise<User | null> {
    return this.userModel
      .findByIdAndUpdate(
        id,
        {
          preferences,
          hasCompletedOnboarding: true,
        },
        { new: true },
      )
      .exec();
  }
}
