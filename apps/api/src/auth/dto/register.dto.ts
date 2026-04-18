import { createZodDto } from 'nestjs-zod';
import { registerSchema } from '@tge/types/schemas/auth';

export class RegisterDto extends createZodDto(registerSchema) {}
