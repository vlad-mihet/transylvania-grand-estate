import { createZodDto } from 'nestjs-zod';
import { changePasswordSchema } from '@tge/types/schemas/auth';

export class ChangePasswordDto extends createZodDto(changePasswordSchema) {}
