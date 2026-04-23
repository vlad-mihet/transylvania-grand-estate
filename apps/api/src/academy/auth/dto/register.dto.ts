import { createZodDto } from 'nestjs-zod';
import {
  academyRegisterSchema,
  academyResendVerificationSchema,
  academyVerifyEmailSchema,
} from '@tge/types/schemas/academy';

export class AcademyRegisterDto extends createZodDto(academyRegisterSchema) {}
export class AcademyVerifyEmailDto extends createZodDto(
  academyVerifyEmailSchema,
) {}
export class AcademyResendVerificationDto extends createZodDto(
  academyResendVerificationSchema,
) {}
