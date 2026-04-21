import { createZodDto } from 'nestjs-zod';
import { updateUserSchema } from '@tge/types/schemas/auth';

export class UpdateUserDto extends createZodDto(updateUserSchema) {}
