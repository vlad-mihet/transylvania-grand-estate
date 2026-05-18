import { z } from "zod";
import {
  CourseStatus,
  CourseVisibility,
  LessonType,
  LessonStatus,
} from "@prisma/client";
import {
  entryModeSchema,
  lessonEmbedUrlSchema,
  localizedRichTextSchema,
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
    description: localizedRichTextSchema,
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
    mode: entryModeSchema,
  })
  .strict();

export const queryCourseSchema = paginationSchema.extend({
  status: z.nativeEnum(CourseStatus).optional(),
  visibility: courseVisibilitySchema.optional(),
  search: z.string().max(200).optional(),
  sort: z.enum(["order", "newest", "oldest"]).optional(),
});

/**
 * Clone an existing course (and optionally its lessons) into a fresh
 * draft. Use case: editor wants to author a new course that mirrors the
 * structure of an existing one without rebuilding from scratch. Copies
 * localized fields + the `draft` JSON column verbatim; cover image is
 * referenced (not duplicated) since the storage path is per-course-id
 * and the next image upload on the clone will point to its own path.
 */
export const duplicateCourseSchema = z
  .object({
    slug: slugSchema,
    copyLessons: z.boolean().optional(),
  })
  .strict();

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type QueryCourseInput = z.infer<typeof queryCourseSchema>;
export type DuplicateCourseInput = z.infer<typeof duplicateCourseSchema>;

// ─── Lesson ─────────────────────────────────────────────

export const lessonTypeSchema = z.nativeEnum(LessonType);

export const createLessonSchema = z
  .object({
    slug: slugSchema,
    // Sparse int; admin UI default = `maxExistingOrderInCourse + 10`.
    order: z.number().int().min(0),
    title: localizedStringSchema,
    excerpt: localizedStringSchema,
    content: localizedRichTextSchema,
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
    mode: entryModeSchema,
  })
  .strict();

/**
 * Student-facing catalog query. Paginated list of public-visibility courses.
 * Optional search hits the localized title + slug. Default page size mirrors
 * the global pagination default (12) and renders well in the 2-column card grid.
 */
export const studentCatalogQuerySchema = paginationSchema.extend({
  search: z.string().max(200).optional(),
});
export type StudentCatalogQueryInput = z.infer<typeof studentCatalogQuerySchema>;

/**
 * Student-facing course lessons query. Default page size 20 fits the
 * "smart paginated TOC" UX (page numbers + auto-jump to the resume page).
 * `search` filters by lesson title (any locale) or slug.
 */
export const studentLessonsQuerySchema = paginationSchema.extend({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
});
export type StudentLessonsQueryInput = z.infer<typeof studentLessonsQuerySchema>;

export const queryLessonSchema = paginationSchema.extend({
  status: z.nativeEnum(LessonStatus).optional(),
  type: lessonTypeSchema.optional(),
  sort: z.enum(["order", "newest", "oldest"]).optional(),
  // Server-side title/slug search. The admin paginates lessons so we can no
  // longer rely on client-side filtering over the full course at once.
  search: z.string().max(200).optional(),
});

export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
export type QueryLessonInput = z.infer<typeof queryLessonSchema>;

// ─── Lesson attachments ─────────────────────────────────

/**
 * Per-lesson downloadable file (PDF, ZIP, slide deck, etc.). The
 * student lesson endpoint returns these inline so the lesson page
 * stays one round-trip; the admin attachments controller manages the
 * write side. `downloadUrl` is short-lived when the storage backend is
 * R2 (signed URL); local-dev returns a stable static path.
 */
export type LessonAttachmentSummary = {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  downloadUrl: string;
  sortOrder: number;
  createdAt: string;
};

/**
 * Atomic reorder of all attachments on a lesson. Client sends the full
 * ordered sequence of attachment ids and the server rewrites `sortOrder`
 * accordingly. The cap matches `ATTACHMENTS_PER_LESSON_CAP` on the API
 * side, and stays as a "full array" payload because per-lesson
 * attachments are bounded at 10 — pagination isn't a concern.
 */
export const reorderLessonAttachmentsSchema = z
  .object({
    attachmentIds: z.array(z.string().uuid()).min(1).max(10),
  })
  .strict();

export type ReorderLessonAttachmentsInput = z.infer<
  typeof reorderLessonAttachmentsSchema
>;

/**
 * Move a single lesson to a target 1-based position inside its course. The
 * server fetches the course's lessons ASC, splices the moved lesson to
 * `targetOrder - 1`, then renumbers densely as `(index + 1) * 10` in one
 * transaction. Out-of-range `targetOrder` values are clamped to
 * `[1, lessonCount]` rather than rejected — the admin "Move to position N"
 * UI binds an `<input type="number">` and we'd rather snap-to-end than
 * surface a 400 for a value the user typed one off.
 *
 * Decoupling display from the data structure: pagination on the lessons
 * list is impossible with a bulk "send the whole array back" reorder
 * (cross-page moves can't see the rows on other pages). A move-by-id
 * operation lets pagination and drag-and-drop coexist at any course size.
 */
export const moveLessonSchema = z
  .object({
    targetOrder: z.number().int().min(1).max(10_000),
  })
  .strict();

export type MoveLessonInput = z.infer<typeof moveLessonSchema>;

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

/**
 * Bulk-grant access to one course (or wildcard) for many students at
 * once. Two complementary inputs — `userIds` are pre-resolved IDs from
 * the admin's student list selection; `emails` come from a pasted CSV
 * or text blob. With `inviteUnknownEmails: true`, addresses without an
 * existing AcademyUser get a fresh invitation; with false they're
 * skipped with reason "no_account". Hard cap of 500 total entries to
 * keep request latency bounded; admins doing larger bulk imports
 * should split the operation.
 */
export const bulkGrantEnrollmentSchema = z
  .object({
    courseId: z.string().uuid().nullable(),
    userIds: z.array(z.string().uuid()).max(500).optional(),
    emails: z.array(z.string().email().max(200)).max(500).optional(),
    inviteUnknownEmails: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) =>
      (data.userIds?.length ?? 0) + (data.emails?.length ?? 0) > 0,
    {
      message: "Provide at least one userId or email",
      path: ["userIds"],
      params: { code: "validation.grantEnrollment.empty_targets" },
    },
  )
  .refine(
    (data) =>
      (data.userIds?.length ?? 0) + (data.emails?.length ?? 0) <= 500,
    {
      message: "Combined userIds + emails must be ≤ 500",
      path: ["emails"],
      params: { code: "validation.grantEnrollment.too_many_targets" },
    },
  );

export type GrantEnrollmentInput = z.infer<typeof grantEnrollmentSchema>;
export type ListEnrollmentsInput = z.infer<typeof listEnrollmentsSchema>;
export type BulkGrantEnrollmentInput = z.infer<
  typeof bulkGrantEnrollmentSchema
>;

/**
 * Per-row outcome envelope returned by the bulk endpoint. Counts cover
 * the happy paths (granted, already-enrolled, invited); `skipped`
 * carries the rest with a structured reason so the admin UI can render
 * a useful "what went wrong" table.
 */
export type BulkGrantEnrollmentResult = {
  granted: number;
  alreadyEnrolled: number;
  invited: number;
  skipped: Array<{
    email?: string;
    userId?: string;
    reason:
      | "no_account"
      | "user_not_found"
      | "course_not_found"
      | "invite_failed"
      | "duplicate";
  }>;
};

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

/**
 * Soft-disable an AcademyUser account. Optional `reason` is stored
 * verbatim on the user row for audit and surfaced to the student on
 * subsequent login attempts so they know who to contact.
 */
export const suspendAcademyUserSchema = z
  .object({
    reason: z.string().max(500).optional(),
  })
  .strict();

export type ListAcademyUsersInput = z.infer<typeof listAcademyUsersSchema>;
export type UpdateAcademyUserInput = z.infer<typeof updateAcademyUserSchema>;
export type SuspendAcademyUserInput = z.infer<typeof suspendAcademyUserSchema>;

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

/**
 * Shared user shape carried on every auth-token response (login, refresh,
 * verify-email, accept-invite, register-with-verification-disabled).
 * Mirrors AcademyAuthService.shape() — three fields, no PII beyond the
 * email already in the JWT claims.
 */
export const academyAuthUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
});

/**
 * Discriminated response for `POST /academy/auth/register`. When the
 * EMAIL_VERIFICATION_DISABLED flag is on, the API auto-verifies the new
 * account and returns tokens directly (`verificationRequired: false`) so
 * the client can land the user on the dashboard. With the flag off, the
 * response carries no tokens and the client renders the "check your inbox"
 * screen — matching the historical behavior. The discriminator lets the
 * client branch without reading any frontend env var.
 */
export const academyRegisterResponseSchema = z.discriminatedUnion(
  "verificationRequired",
  [
    z.object({
      ok: z.literal(true),
      verificationRequired: z.literal(true),
    }),
    z.object({
      ok: z.literal(true),
      verificationRequired: z.literal(false),
      accessToken: z.string(),
      refreshToken: z.string(),
      user: academyAuthUserSchema,
    }),
  ],
);

export type AcademyAuthUser = z.infer<typeof academyAuthUserSchema>;
export type AcademyRegisterResponse = z.infer<
  typeof academyRegisterResponseSchema
>;

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
 * the prose-tailwind pattern already used by revery's blog detail page.
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
  /**
   * Per-student progress summary. Populated on both the dashboard (`GET
   * /academy/courses`) and catalog (`GET /academy/courses/catalog`) lists;
   * the frontend uses it to render the progress bar + `Continuă →` CTA.
   * `resumeLessonSlug` is the lesson the "Continue" button should link to:
   * the in-progress lesson with the most recent `lastSeenAt`, else the
   * first never-opened lesson, else the course's first lesson when every
   * lesson is already complete. `null` when the course has zero published
   * lessons.
   */
  progress: {
    totalLessons: number;
    completedLessons: number;
    lastSeenAt: string | null;
    resumeLessonSlug: string | null;
  };
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
  // Per-student completion flag — true when the user has clicked
  // `Marchează ca terminată`. Only present on the course-detail response
  // where the API attaches it from `LessonProgressService`.
  completed?: boolean;
};

// ─── Admin reporting (academy overview) ──────────────────

/**
 * Academy section landing dashboard. Single endpoint hits a handful of
 * cheap aggregations and returns one envelope so the page is one
 * round-trip. `recentActivity` is intentionally short (max 20) — the
 * dashboard is a glance surface, not an audit log.
 */
export type AcademyOverview = {
  mau30d: number;
  activeEnrollments: number;
  newStudentsLast7d: number;
  pendingInvitations: number;
  topCoursesByCompletion: Array<{
    courseId: string;
    slug: string;
    title: Record<"ro" | "en" | "fr" | "de", string | undefined>;
    completedCount: number;
    enrolledCount: number;
    completionRate: number;
  }>;
  recentActivity: Array<{
    studentId: string;
    studentName: string;
    kind: "started" | "completed";
    courseId: string;
    courseSlug: string;
    courseTitle: Record<"ro" | "en" | "fr" | "de", string | undefined>;
    lessonId: string;
    lessonSlug: string;
    at: string;
  }>;
};

// ─── Admin reporting (course stats) ──────────────────────

/**
 * Course-level completion rollup for the admin course detail page.
 * `enrolledCount` counts distinct AcademyUsers reachable by either an
 * active wildcard enrollment or an active per-course enrollment. Started
 * users have at least one `LessonProgress` row in the course; completed
 * users have a `completedAt`-stamped row for every currently-published
 * lesson. `avgDaysToFirstCompletion` is null when no user has fully
 * completed the course (otherwise: average days from earliest
 * `startedAt` to latest `completedAt`, rounded to 1 decimal).
 */
export type AcademyCourseStats = {
  enrolledCount: number;
  startedCount: number;
  completedCount: number;
  /** 0..100 integer. 0 when enrolledCount is 0. */
  completionRate: number;
  avgDaysToFirstCompletion: number | null;
  totalPublishedLessons: number;
  lessonCompletionDistribution: Array<{
    lessonId: string;
    slug: string;
    completedCount: number;
  }>;
};

// ─── Admin reporting (per-student progress) ───────────────

/**
 * One row per course the student has access to. Wildcard enrollments
 * expand into every published course; per-course enrollments contribute
 * a single row each. Drives the "Enrollments" section on the admin
 * student-detail page so an admin can see at a glance which courses a
 * student is making progress on without clicking into each one.
 *
 * `firstSeenAt` / `lastCompletedAt` are derived from the user's
 * `LessonProgress` rows for that course. `enrollmentId` is null for
 * rows surfaced by a wildcard (no per-course row exists yet); per-course
 * grants carry their enrollment id so the admin can revoke just one
 * row without touching the wildcard.
 */
export type AcademyStudentProgressRow = {
  courseId: string;
  slug: string;
  title: Record<"ro" | "en" | "fr" | "de", string | undefined>;
  totalLessons: number;
  completedLessons: number;
  /** 0..100, integer. 0 when totalLessons is 0. */
  completionRate: number;
  lastSeenAt: string | null;
  resumeLessonSlug: string | null;
  firstSeenAt: string | null;
  lastCompletedAt: string | null;
  /** Whether the row was surfaced by a wildcard enrollment. */
  viaWildcard: boolean;
  /** The per-course enrollment id, if any. Null on wildcard rows. */
  enrollmentId: string | null;
};

/**
 * Per-lesson progress state for a single (student, course) pair. Used
 * by the admin "View detailed progress" disclosure on the student-detail
 * page to show which lessons have been started/completed and when.
 */
export type AcademyStudentLessonState = {
  lessonId: string;
  slug: string;
  title: Record<"ro" | "en" | "fr" | "de", string | undefined>;
  order: number;
  status: "draft" | "published" | "archived";
  startedAt: string | null;
  completedAt: string | null;
  lastSeenAt: string | null;
};

export type AcademyLessonDetail = AcademyLessonSummary & {
  // Raw markdown source for one locale, chosen by the API from the
  // requested `Accept-Language` header with fallback to `ro`. The client
  // renders via react-markdown (+ remark-gfm). `servedLocale` lets the UI
  // show a "translation pending" badge when it differs from the requested.
  content: string;
  servedLocale: "ro" | "en" | "fr" | "de";
  videoUrl: string | null;
  // Completion + navigation: the API stamps the user's own row on read,
  // then returns completion state + the neighbouring lessons (by
  // `order`) so the lesson page can render prev/next + a "Marchează ca
  // terminată" control without a second request.
  completed: boolean;
  completedAt: string | null;
  prev: { slug: string; localizedTitle: string } | null;
  next: { slug: string; localizedTitle: string } | null;
  // Downloadable attachments (PDFs, slide decks, etc.) admin-attached to
  // this lesson. Returned ordered by sortOrder ascending. Empty array
  // when the lesson has no attachments.
  attachments: LessonAttachmentSummary[];
};
