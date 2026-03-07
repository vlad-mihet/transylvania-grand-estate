import { IsString, IsInt, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { LocalizedStringDto } from '../../common/dto/localized-string.dto';

export class CreateTestimonialDto {
  @IsString()
  clientName: string;

  @IsString()
  location: string;

  @IsString()
  propertyType: string;

  @ValidateNested()
  @Type(() => LocalizedStringDto)
  quote: LocalizedStringDto;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;
}
