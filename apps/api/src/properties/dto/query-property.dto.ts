import { createZodDto } from 'nestjs-zod';
import { queryPropertySchema } from '@tge/types/schemas/property';

export class QueryPropertyDto extends createZodDto(queryPropertySchema) {}
