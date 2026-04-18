import { createZodDto } from 'nestjs-zod';
import { createArticleSchema } from '@tge/types/schemas/article';

export class CreateArticleDto extends createZodDto(createArticleSchema) {}
