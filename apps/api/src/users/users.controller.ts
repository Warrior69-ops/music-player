import {
  Controller,
  Patch,
  Body,
  UseGuards,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdatePreferencesDto } from './dto/preferences.dto';

@UseGuards(JwtAuthGuard)
@Controller(['users', 'api/users'])
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('preferences')
  async updatePreferences(
    @Request() req: any,
    @Body() dto: UpdatePreferencesDto,
  ) {
    const userId = req.user._id || req.user.id;
    const updatedUser = await this.usersService.updateMusicPreferences(userId, {
      languages: dto.languages,
      favoriteArtists: dto.favoriteArtists,
    });

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return {
      success: true,
      message: 'Preferences updated successfully',
      data: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        hasCompletedOnboarding: updatedUser.hasCompletedOnboarding,
        preferences: updatedUser.preferences,
      },
    };
  }
}
