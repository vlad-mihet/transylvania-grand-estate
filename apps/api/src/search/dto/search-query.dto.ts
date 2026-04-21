import { createZodDto } from 'nestjs-zod';
import { searchQuerySchema } from '@tge/types/schemas/search';

export class SearchQueryDto extends createZodDto(searchQuerySchema) {}
