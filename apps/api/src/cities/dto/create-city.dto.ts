import { IsString, IsOptional, IsInt, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { LocalizedStringDto } from '../../common/dto/localized-string.dto';

export class CreateCityDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @ValidateNested()
  @Type(() => LocalizedStringDto)
  description: LocalizedStringDto;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  propertyCount?: number;
}
