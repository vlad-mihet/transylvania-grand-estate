import { createZodDto } from 'nestjs-zod';
import {
  createCourseSchema,
  duplicateCourseSchema,
  updateCourseSchema,
  queryCourseSchema,
  studentCatalogQuerySchema,
} from '@tge/types/schemas/academy';

export class CreateCourseDto extends createZodDto(createCourseSchema) {}
export class UpdateCourseDto extends createZodDto(updateCourseSchema) {}
export class QueryCourseDto extends createZodDto(queryCourseSchema) {}
export class StudentCatalogQueryDto extends createZodDto(
  studentCatalogQuerySchema,
) {}
export class DuplicateCourseDto extends createZodDto(duplicateCourseSchema) {}
