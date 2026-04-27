import { createZodDto } from 'nestjs-zod';
import {
  createLessonSchema,
  updateLessonSchema,
  queryLessonSchema,
  studentLessonsQuerySchema,
} from '@tge/types/schemas/academy';

export class CreateLessonDto extends createZodDto(createLessonSchema) {}
export class UpdateLessonDto extends createZodDto(updateLessonSchema) {}
export class QueryLessonDto extends createZodDto(queryLessonSchema) {}
export class StudentLessonsQueryDto extends createZodDto(
  studentLessonsQuerySchema,
) {}
