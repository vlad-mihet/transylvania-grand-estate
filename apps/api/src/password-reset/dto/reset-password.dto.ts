import { createZodDto } from 'nestjs-zod';
import { resetPasswordSchema } from '@tge/types/schemas/password-reset';

export class ResetPasswordDto extends createZodDto(resetPasswordSchema) {}
