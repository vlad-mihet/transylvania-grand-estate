import { createZodDto } from 'nestjs-zod';
import { verifyResetTokenSchema } from '@tge/types/schemas/password-reset';

export class VerifyResetTokenDto extends createZodDto(verifyResetTokenSchema) {}
