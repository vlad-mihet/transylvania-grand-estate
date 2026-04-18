import { createZodDto } from 'nestjs-zod';
import { createCountySchema } from '@tge/types/schemas/county';

export class CreateCountyDto extends createZodDto(createCountySchema) {}
