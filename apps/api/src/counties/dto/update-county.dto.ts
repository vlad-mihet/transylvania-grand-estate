import { createZodDto } from 'nestjs-zod';
import { updateCountySchema } from '@tge/types/schemas/county';

export class UpdateCountyDto extends createZodDto(updateCountySchema) {}
