import { z } from "zod";
import {
  CourseStatus,
  CourseVisibility,
  LessonType,
  LessonStatus,
} from "@prisma/client";
import {
  lessonEmbedUrlSchema,
  localizedStringSchema,
  paginationSchema,
  slugSchema,
} from "./_primitives";
import { passwordPolicy } from "./auth";

/**
 * Academy — study-platform content & access-control DTOs. The admin surface
 * (CRUD for courses/lessons/enrollments) and the student surface (read
 * endpoints) both pull from here. Schemas mirror the Prisma models in
 * `apps/api/prisma/schema.prisma`.
 */

// ─── Course ─────────────────────────────────────────────

export const courseVisibilitySchema = z.nativeEnum(CourseVisibility);

export const createCourseSchema = z
  .object({
    slug: slugSchema,
    title: localizedStringSchema,
    description: localizedStringSchema,
    coverImage: z.string().min(1).max(500).optional(),
    // `enrolled` = listing + lesson access require an AcademyEnrollment row;
    // `public` = any authenticated academy user can read without enrollment.
    // Default `enrolled` preserves pre-existing semantics for admin-authored
    // courses that don't explicitly mark themselves public.
    visibility: courseVisibilitySchema.optional(),
    // Sparse int so reorders don't rewrite every row. Admin UI defaults to
    // `maxExistingOrder + 10`. Plain number (not coerced) because this
    // field only travels in JSON bodies — query params never carry it.
    order: z.number().int().min(0).optional(),
  })
  .strict();

export const updateCourseSchema = createCourseSchema
  .partial()
  .extend({
    status: z.nativeEnum(CourseStatus).optional(),
    publishedAt: z.string().datetime().nullable().optional(),
  })
  .strict();

export const queryCourseSchema = paginationSchema.extend({
  status: z.nativeEnum(CourseStatus).optional(),
  visibility: courseVisibilitySchema.optional(),
  search: z.string().max(200).optional(),
  sort: z.enum(["order", "newest", "oldest"]).optional(),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type QueryCourseInput = z.infer<typeof queryCourseSchema>;

// ─── Lesson ─────────────────────────────────────────────

export const lessonTypeSchema = z.nativeEnum(LessonType);

export const createLessonSchema = z
  .object({
    slug: slugSchema,
    // Sparse int; admin UI default = `maxExistingOrderInCourse + 10`.
    order: z.number().int().min(0),
    title: localizedStringSchema,
    excerpt: localizedStringSchema,
    content: localizedStringSchema,
    type: lessonTypeSchema.optional(),
    // Only meaningful when type === 'video'. The schema normalizes share
    // URLs to their canonical privacy-friendly embed form (youtube-nocookie
    // or player.vimeo) and rejects other hosts; the service additionally
    // rejects a non-null url on a text lesson. Optional here so forms can
    // default null when editing a text lesson.
    videoUrl: lessonEmbedUrlSchema.nullable().optional(),
    // Seconds, not minutes — finer granularity matches what oEmbed returns.
    // Only meaningful when type === 'video'; the service rejects a non-null
    // value on text lessons. Upper bound 14400s (4h) is a sanity ceiling;
    // nothing longer than that belongs in a lesson.
    videoDurationSeconds: z
      .number()
      .int()
      .min(1)
      .max(14400)
      .nullable()
      .optional(),
  })
  .strict();

export const updateLessonSchema = createLessonSchema
  .partial()
  .extend({
    status: z.nativeEnum(LessonStatus).optional(),
    publishedAt: z.string().datetime().nullable().optional(),
  })
  .strict();

export const queryLessonSchema = paginationSchema.extend({
  status: z.nativeEnum(LessonStatus).optional(),
  type: lessonTypeSchema.optional(),
  sort: z.enum(["order", "newest", "oldest"]).optional(),
});

export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
export type QueryLessonInput = z.infer<typeof queryLessonSchema>;

/**
 * Bulk reorder for lessons inside a course. The full ordered sequence of
 * lesson ids is the single source of truth — the server rewrites `order`
 * as `(index + 1) * 10` for each, so positions are dense after the write
 * and sparse gaps reappear only after manual edits.
 *
 * The server rejects if the array doesn't exactly cover the course's
 * current lessons (missing → 400, duplicate → 400, foreign id → 400).
 * This makes the endpoint a safe atomic operation: no partial reorders
 * where some lessons silently keep their old `order`.
 */
export const reorderLessonsSchema = z
  .object({
    lessonIds: z.array(z.string().uuid()).min(1).max(500),
  })
  .strict();

export type ReorderLessonsInput = z.infer<typeof reorderLessonsSchema>;

// ─── Enrollment ─────────────────────────────────────────

/**
 * Admin grants a student access to academy content.
 *  - `courseId: null` (or omitted) = wildcard "all current + future courses".
 *  - `courseId: <uuid>` = per-course access.
 * Uniqueness is enforced at the DB level on (userId, courseId).
 */
export const grantEnrollmentSchema = z
  .object({
    userId: z.string().uuid(),
    courseId: z.string().uuid().nullable().optional(),
  })
  .strict();

export const listEnrollmentsSchema = paginationSchema.extend({
  userId: z.string().uuid().optional(),
  courseId: z.string().uuid().optional(),
  includeRevoked: z
    .union([z.boolean(), z.enum(["true", "false"]).transform((v) => v === "true")])
    .optional(),
});

export type GrantEnrollmentInput = z.infer<typeof grantEnrollmentSchema>;
export type ListEnrollmentsInput = z.infer<typeof listEnrollmentsSchema>;

// ─── Academy user (admin-facing management) ─────────────

/**
 * Admin-facing list filter for academy students. Status covers lifecycle
 * states the admin UI wants to slice by.
 */
export const listAcademyUsersSchema = paginationSchema.extend({
  search: z.string().max(200).optional(),
  enrolled: z
    .union([z.boolean(), z.enum(["true", "false"]).transform((v) => v === "true")])
    .optional(),
  // Filter on whether the student's email has been verified. Surfaces both
  // self-registered-but-unverified accounts and Google/invited accounts
  // (both of which are verified at creation time).
  verified: z
    .union([z.boolean(), z.enum(["true", "false"]).transform((v) => v === "true")])
    .optional(),
  sort: z.enum(["newest", "oldest", "lastLogin"]).optional(),
});

/**
 * Editable AcademyUser fields surfaced to admins. Email is immutable
 * (invitation-bound) and the password hash is set via the reset flow only.
 */
export const updateAcademyUserSchema = z
  .object({
    name: z.string().min(2).max(200).optional(),
    locale: z.enum(["ro", "en", "fr", "de"]).nullable().optional(),
  })
  .strict();

export type ListAcademyUsersInput = z.infer<typeof listAcademyUsersSchema>;
export type UpdateAcademyUserInput = z.infer<typeof updateAcademyUserSchema>;

// ─── Invitation (admin issues, student accepts) ──────────

/**
 * Admin issues an academy invitation. `initialCourseId` is the enrollment
 * granted on acceptance — null means wildcard. `expiresInDays` default is
 * 7 in the service; 1-30 keeps links from getting stale.
 */
export const inviteAcademyUserSchema = z
  .object({
    email: z.string().email().max(200),
    name: z.string().min(2).max(200),
    locale: z.enum(["ro", "en", "fr", "de"]).optional(),
    initialCourseId: z.string().uuid().nullable().optional(),
    expiresInDays: z.number().int().min(1).max(30).optional(),
  })
  .strict();

export const verifyAcademyInvitationSchema = z
  .object({
    token: z.string().min(16).max(256),
  })
  .strict();

export const acceptAcademyInvitationWithPasswordSchema = z
  .object({
    token: z.string().min(16).max(256),
    password: passwordPolicy,
  })
  .strict();

export type InviteAcademyUserInput = z.infer<typeof inviteAcademyUserSchema>;
export type VerifyAcademyInvitationInput = z.infer<
  typeof verifyAcademyInvitationSchema
>;
export type AcceptAcademyInvitationWithPasswordInput = z.infer<
  typeof acceptAcademyInvitationWithPasswordSchema
>;

/**
 * Shape returned by `/academy/auth/invitations/verify` — kept in sync with
 * the NestJS service. Not a Zod schema (response only).
 */
export type VerifyAcademyInvitationResult = {
  email: string;
  name: string;
  expiresAt: string; // ISO
  initialCourseTitle?: string | null;
};

// ─── Auth (academy realm) ────────────────────────────────

export const academyLoginSchema = z
  .object({
    email: z.string().email().max(200),
    password: z.string().max(200),
  })
  .strict();

export const academyRefreshSchema = z
  .object({
    refreshToken: z.string().min(1),
  })
  .strict();

export const academyChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(200),
    newPassword: passwordPolicy,
  })
  .strict();

/**
 * Forgot-password entrypoint. Always returns 200 so a caller can't
 * enumerate which emails belong to the academy user pool. Throttled at
 * the controller.
 */
export const academyForgotPasswordSchema = z
  .object({
    email: z.string().email().max(200),
  })
  .strict();

/**
 * Reset-password completion. Token is the plaintext from the email URL;
 * server hashes it and looks up `AcademyPasswordResetToken`. 410 Gone on
 * expired/used tokens, 404 on unknown tokens.
 */
export const academyResetPasswordSchema = z
  .object({
    token: z.string().min(16).max(256),
    newPassword: passwordPolicy,
  })
  .strict();

/**
 * Self-edit of the authenticated academy user's profile. Only mutable
 * fields — email change requires a dedicated verification flow we don't
 * ship in v1.
 */
export const updateAcademyProfileSchema = z
  .object({
    name: z.string().min(2).max(200).optional(),
    locale: z.enum(["ro", "en", "fr", "de"]).nullable().optional(),
  })
  .strict();

/**
 * Public self-service registration for the academy. Unlike invitations
 * (admin-issued), this endpoint is open to anyone; bot defence is the
 * rate limit on the controller + the email-verification gate (no tokens
 * issued until the user clicks the link). Successful registration creates
 * an unverified AcademyUser and emails a verification link.
 */
export const academyRegisterSchema = z
  .object({
    email: z.string().email().max(200),
    password: passwordPolicy,
    name: z.string().min(2).max(200),
    locale: z.enum(["ro", "en", "fr", "de"]).optional(),
  })
  .strict();

/**
 * Completes self-service registration. Atomic one-shot via `updateMany`
 * on `usedAt IS NULL`; on success the server marks `emailVerifiedAt`,
 * grants a wildcard `AcademyEnrollment`, and returns access + refresh
 * tokens so the caller can land on the dashboard without a second login.
 */
export const academyVerifyEmailSchema = z
  .object({
    token: z.string().min(16).max(256),
  })
  .strict();

/**
 * Re-sends the verification email for a pending self-registration.
 * Anti-enumeration: always returns 202 whether the address exists or is
 * already verified. Controller-level throttle is tight (2/min) because
 * the happy-path cost is a Resend API call.
 */
export const academyResendVerificationSchema = z
  .object({
    email: z.string().email().max(200),
  })
  .strict();

export type AcademyRegisterInput = z.infer<typeof academyRegisterSchema>;
export type AcademyVerifyEmailInput = z.infer<typeof academyVerifyEmailSchema>;
export type AcademyResendVerificationInput = z.infer<
  typeof academyResendVerificationSchema
>;

export type AcademyLoginInput = z.infer<typeof academyLoginSchema>;
export type AcademyRefreshInput = z.infer<typeof academyRefreshSchema>;
export type AcademyChangePasswordInput = z.infer<
  typeof academyChangePasswordSchema
>;
export type AcademyForgotPasswordInput = z.infer<
  typeof academyForgotPasswordSchema
>;
export type AcademyResetPasswordInput = z.infer<
  typeof academyResetPasswordSchema
>;
export type UpdateAcademyProfileInput = z.infer<
  typeof updateAcademyProfileSchema
>;

// ─── Response shapes (read-only, typed for the client) ───

/**
 * What the student-facing list endpoint returns. Content is rendered
 * server-side to HTML for text lessons; client just injects it. Matches
 * the prose-tailwind pattern already used by reveria's blog detail page.
 */
export type AcademyCourseSummary = {
  id: string;
  slug: string;
  title: Record<"ro" | "en" | "fr" | "de", string | undefined>;
  description: Record<"ro" | "en" | "fr" | "de", string | undefined>;
  coverImage: string | null;
  lessonCount: number;
  order: number;
  publishedAt: string | null;
  visibility: "public" | "enrolled";
  /**
   * Whether the requesting student has any active enrollment covering this
   * course — either a per-course row or a non-revoked wildcard. Dashboard
   * rows are always `true` by definition; catalog rows compute this so the
   * UI can surface an `Înscris` badge and hide the enroll button.
   */
  enrolled: boolean;
  /**
   * True only when the user's enrollment for this course is a self-service,
   * per-course row (`grantedById IS NULL AND courseId = this.id`). Admin
   * grants and wildcards aren't self-removable — those show no unenroll
   * affordance on the dashboard. Absent when `enrolled` is false.
   */
  canUnenroll?: boolean;
};

export type AcademyLessonSummary = {
  id: string;
  slug: string;
  order: number;
  title: Record<"ro" | "en" | "fr" | "de", string | undefined>;
  excerpt: Record<"ro" | "en" | "fr" | "de", string | undefined>;
  type: "text" | "video";
  // Reading estimate for text lessons, computed server-side from the
  // served-locale content on every read. Null for video lessons.
  readingTimeMinutes: number | null;
  // Video duration in seconds. Null for text lessons and for video
  // lessons where the duration hasn't been captured yet (oEmbed scrape
  // is a follow-up; editors can also set it manually for now).
  videoDurationSeconds: number | null;
  publishedAt: string | null;
};

export type AcademyLessonDetail = AcademyLessonSummary & {
  // Raw markdown source for one locale, chosen by the API from the
  // requested `Accept-Language` header with fallback to `ro`. The client
  // renders via react-markdown (+ remark-gfm). `servedLocale` lets the UI
  // show a "translation pending" badge when it differs from the requested.
  content: string;
  servedLocale: "ro" | "en" | "fr" | "de";
  videoUrl: string | null;
};
