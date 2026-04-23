import { createZodDto } from 'nestjs-zod';
import { academyChangePasswordSchema } from '@tge/types/schemas/academy';

export class AcademyChangePasswordDto extends createZodDto(
  academyChangePasswordSchema,
) {}
