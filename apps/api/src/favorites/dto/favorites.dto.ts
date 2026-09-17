import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class AddFavoriteDto {
  @IsNotEmpty()
  provider: string;

  @IsNotEmpty()
  providerTrackId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  artist: string;

  @IsOptional()
  albumArt?: string;

  @IsOptional()
  duration?: number;
}
