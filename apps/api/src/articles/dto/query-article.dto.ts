import { createZodDto } from 'nestjs-zod';
import { queryArticleSchema } from '@tge/types/schemas/article';

export class QueryArticleDto extends createZodDto(queryArticleSchema) {}
