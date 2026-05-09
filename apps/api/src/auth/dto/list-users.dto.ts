import { createZodDto } from 'nestjs-zod';
import { listUsersSchema } from '@tge/types/schemas/auth';

export class ListUsersDto extends createZodDto(listUsersSchema) {}
