import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LocalizedStringDto } from '../../common/dto/localized-string.dto';

export class CreateDeveloperDto {
  @IsString()
  slug: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @ValidateNested()
  @Type(() => LocalizedStringDto)
  description: LocalizedStringDto;

  @ValidateNested()
  @Type(() => LocalizedStringDto)
  shortDescription: LocalizedStringDto;

  @IsString()
  city: string;

  @IsString()
  citySlug: string;

  @IsOptional()
  @IsUrl()
  website?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  projectCount?: number;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  tagline?: LocalizedStringDto;
}
