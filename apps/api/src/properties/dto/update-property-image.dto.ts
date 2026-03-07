import { IsOptional, IsBoolean, IsInt, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { LocalizedStringDto } from '../../common/dto/localized-string.dto';

export class UpdatePropertyImageDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedStringDto)
  alt?: LocalizedStringDto;

  @IsOptional()
  @IsBoolean()
  isHero?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
