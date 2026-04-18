import { createZodDto } from 'nestjs-zod';
import { updatePropertySchema } from '@tge/types/schemas/property';

export class UpdatePropertyDto extends createZodDto(updatePropertySchema) {}
