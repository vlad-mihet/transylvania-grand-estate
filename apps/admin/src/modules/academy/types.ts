// Centralized type re-exports for the Academy admin module.
// Source-of-truth schemas live in @tge/types/schemas/academy. Admin-side
// view models (the trimmed shapes admin list/detail pages actually consume)
// live here so route pages don't redeclare them inline.

export type {
  AcademyCourseSummary,
  AcademyLessonSummary,
  AcademyLessonDetail,
  AcademyOverview,
  AcademyCourseStats,
  AcademyStudentProgressRow,
  AcademyStudentLessonState,
  LessonAttachmentSummary,
  CreateCourseInput,
  UpdateCourseInput,
  QueryCourseInput,
  DuplicateCourseInput,
  CreateLessonInput,
  UpdateLessonInput,
  QueryLessonInput,
  MoveLessonInput,
  ReorderLessonAttachmentsInput,
  GrantEnrollmentInput,
  BulkGrantEnrollmentInput,
  BulkGrantEnrollmentResult,
  ListEnrollmentsInput,
  ListAcademyUsersInput,
  UpdateAcademyUserInput,
  SuspendAcademyUserInput,
  InviteAcademyUserInput,
} from "@tge/types/schemas/academy";

/**
 * Trimmed Course shape used by the admin list/detail pages. Mirrors the
 * fields actually consumed by lists, tables, and rails — pages should
 * import this rather than re-declaring `type Course = { ... }` inline.
 */
export type CourseListItem = {
  id: string;
  slug: string;
  title: Record<string, string | undefined>;
  status: "draft" | "published" | "archived";
  visibility: "public" | "enrolled";
  order: number;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
  _count: { lessons: number };
};

export type CourseStatusFilter = "draft" | "published" | "archived";

/**
 * Trimmed Lesson shape used by lesson rails, prev/next, and tables.
 * For lesson detail pages, prefer `AcademyLessonDetail` from @tge/types.
 */
export type LessonListItem = {
  id: string;
  slug: string;
  title: Record<string, string | undefined>;
  type: "text" | "video";
  status: "draft" | "published" | "archived";
  order: number;
  updatedAt: string;
};

export type LessonList = {
  data: LessonListItem[];
  meta: { total: number };
};
