import { createZodDto } from 'nestjs-zod';
import { forgotPasswordSchema } from '@tge/types/schemas/password-reset';

export class ForgotPasswordDto extends createZodDto(forgotPasswordSchema) {}
