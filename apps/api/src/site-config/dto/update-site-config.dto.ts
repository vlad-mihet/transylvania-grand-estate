import {
  IsString,
  IsOptional,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LocalizedStringDto } from '../../common/dto/localized-string.dto';

export class UpdateSiteConfigDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  tagline?: LocalizedStringDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  description?: LocalizedStringDto;

  @IsOptional()
  contact?: Record<string, string>;

  @IsOptional()
  @IsArray()
  socialLinks?: Array<{ platform: string; url: string }>;
}
