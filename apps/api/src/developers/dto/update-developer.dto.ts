import { createZodDto } from 'nestjs-zod';
import { updateDeveloperSchema } from '@tge/types/schemas/developer';

export class UpdateDeveloperDto extends createZodDto(updateDeveloperSchema) {}
