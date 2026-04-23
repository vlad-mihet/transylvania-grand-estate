import { createZodDto } from 'nestjs-zod';
import {
  createLessonSchema,
  updateLessonSchema,
  queryLessonSchema,
} from '@tge/types/schemas/academy';

export class CreateLessonDto extends createZodDto(createLessonSchema) {}
export class UpdateLessonDto extends createZodDto(updateLessonSchema) {}
export class QueryLessonDto extends createZodDto(queryLessonSchema) {}
