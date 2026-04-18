import { createZodDto } from 'nestjs-zod';
import { loginSchema } from '@tge/types/schemas/auth';

export class LoginDto extends createZodDto(loginSchema) {}
