import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class LocalizedStringDto {
  @IsString()
  @IsNotEmpty()
  en: string;

  @IsString()
  @IsNotEmpty()
  ro: string;

  @IsOptional()
  @IsString()
  fr?: string;

  @IsOptional()
  @IsString()
  de?: string;
}
