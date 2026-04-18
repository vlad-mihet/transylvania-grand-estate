import { createZodDto } from 'nestjs-zod';
import { updatePropertyImageSchema } from '@tge/types/schemas/property';

export class UpdatePropertyImageDto extends createZodDto(
  updatePropertyImageSchema,
) {}
