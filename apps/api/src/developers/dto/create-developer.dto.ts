import { createZodDto } from 'nestjs-zod';
import { createDeveloperSchema } from '@tge/types/schemas/developer';

export class CreateDeveloperDto extends createZodDto(createDeveloperSchema) {}
