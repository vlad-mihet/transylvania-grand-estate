import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEmail,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LocalizedStringDto } from '../../common/dto/localized-string.dto';

export class CreateAgentDto {
  @IsString()
  slug: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  photo?: string;

  @ValidateNested()
  @Type(() => LocalizedStringDto)
  bio: LocalizedStringDto;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
