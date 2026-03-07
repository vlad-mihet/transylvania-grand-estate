import { IsString, IsNotEmpty } from 'class-validator';

export class LocalizedStringDto {
  @IsString()
  @IsNotEmpty()
  en: string;

  @IsString()
  @IsNotEmpty()
  ro: string;
}
