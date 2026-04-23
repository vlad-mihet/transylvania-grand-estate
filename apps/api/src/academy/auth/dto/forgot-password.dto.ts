import { createZodDto } from 'nestjs-zod';
import {
  academyForgotPasswordSchema,
  academyResetPasswordSchema,
  updateAcademyProfileSchema,
} from '@tge/types/schemas/academy';

export class AcademyForgotPasswordDto extends createZodDto(
  academyForgotPasswordSchema,
) {}
export class AcademyResetPasswordDto extends createZodDto(
  academyResetPasswordSchema,
) {}
export class UpdateAcademyProfileDto extends createZodDto(
  updateAcademyProfileSchema,
) {}
