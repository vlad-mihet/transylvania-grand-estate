import {
  CourseStatus,
  CourseVisibility,
  LessonStatus,
  LessonType,
} from "@prisma/client";

export const LESSON_TYPES: readonly LessonType[] = [
  LessonType.text,
  LessonType.video,
];

export const LESSON_STATUSES: readonly LessonStatus[] = [
  LessonStatus.draft,
  LessonStatus.published,
  LessonStatus.archived,
];

export const COURSE_STATUSES: readonly CourseStatus[] = [
  CourseStatus.draft,
  CourseStatus.published,
  CourseStatus.archived,
];

export const COURSE_VISIBILITIES: readonly CourseVisibility[] = [
  CourseVisibility.enrolled,
  CourseVisibility.public,
];

/**
 * Select-item sentinel used when the admin picks "all courses (wildcard)" in
 * the grant-access flow. Kept outside any page so `value="__wildcard__"` isn't
 * a magic string scattered across two files.
 */
export const WILDCARD_COURSE_VALUE = "__wildcard__";
