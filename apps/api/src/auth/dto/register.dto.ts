import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { AdminRole } from '@prisma/client';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole;
}
