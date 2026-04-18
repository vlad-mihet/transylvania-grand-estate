import { createZodDto } from 'nestjs-zod';
import { createPropertySchema } from '@tge/types/schemas/property';

export class CreatePropertyDto extends createZodDto(createPropertySchema) {}
