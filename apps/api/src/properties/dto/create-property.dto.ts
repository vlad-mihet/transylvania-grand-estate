import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PropertyType, PropertyStatus } from '@prisma/client';
import { LocalizedStringDto } from '../../common/dto/localized-string.dto';

class CoordinatesDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}

export class CreatePropertyDto {
  @IsString()
  slug: string;

  @ValidateNested()
  @Type(() => LocalizedStringDto)
  title: LocalizedStringDto;

  @ValidateNested()
  @Type(() => LocalizedStringDto)
  description: LocalizedStringDto;

  @ValidateNested()
  @Type(() => LocalizedStringDto)
  shortDescription: LocalizedStringDto;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsEnum(PropertyType)
  type: PropertyType;

  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;

  // Location
  @IsString()
  city: string;

  @IsString()
  citySlug: string;

  @IsString()
  neighborhood: string;

  @ValidateNested()
  @Type(() => LocalizedStringDto)
  address: LocalizedStringDto;

  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates: CoordinatesDto;

  // Specs
  @IsInt()
  @Min(0)
  bedrooms: number;

  @IsInt()
  @Min(0)
  bathrooms: number;

  @IsNumber()
  @Min(0)
  area: number;

  @IsOptional()
  @IsNumber()
  landArea?: number;

  @IsInt()
  @Min(0)
  floors: number;

  @IsInt()
  yearBuilt: number;

  @IsOptional()
  @IsInt()
  garage?: number;

  @IsOptional()
  @IsBoolean()
  pool?: boolean;

  // Features
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocalizedStringDto)
  features?: LocalizedStringDto[];

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsBoolean()
  isNew?: boolean;

  @IsOptional()
  @IsString()
  developerId?: string;
}
