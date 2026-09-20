import {
  IsArray,
  IsString,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FavoriteArtistDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  thumbnail: string;
}

export class UpdatePreferencesDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  languages: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FavoriteArtistDto)
  @ArrayMinSize(5)
  favoriteArtists: FavoriteArtistDto[];
}
