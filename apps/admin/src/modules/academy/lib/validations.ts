import { z } from "zod";
import { CourseStatus, LessonStatus } from "@prisma/client";
import {
  createCourseSchema,
  createLessonSchema,
} from "@tge/types/schemas/academy";

/**
 * Unified form schemas for the admin. Create and edit use the same shape;
 * pages craft the right API payload at submit time (strip `status` on
 * create, include it on edit).
 */
export const courseFormSchema = createCourseSchema.extend({
  status: z.nativeEnum(CourseStatus).optional(),
});
export type CourseFormValues = z.infer<typeof courseFormSchema>;

export const lessonFormSchema = createLessonSchema.extend({
  status: z.nativeEnum(LessonStatus).optional(),
});
export type LessonFormValues = z.infer<typeof lessonFormSchema>;
