import { createZodDto } from 'nestjs-zod';
import { updateArticleSchema } from '@tge/types/schemas/article';

export class UpdateArticleDto extends createZodDto(updateArticleSchema) {}
