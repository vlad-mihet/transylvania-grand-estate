-- Academy foundation: AcademyUser pool, Course/Lesson hierarchy,
-- AcademyEnrollment access control, and parallel auth tables (invitation,
-- password-reset, revoked-token) so admin and academy token spaces stay
-- independent. No changes to existing tables.

-- ─── Enums ───────────────────────────────────────────────

CREATE TYPE "CourseStatus" AS ENUM ('draft', 'published', 'archived');
CREATE TYPE "LessonType"   AS ENUM ('text', 'video');
CREATE TYPE "LessonStatus" AS ENUM ('draft', 'published', 'archived');

-- ─── AcademyUser ─────────────────────────────────────────

CREATE TABLE "academy_users" (
  "id"            TEXT         NOT NULL,
  "email"         TEXT         NOT NULL,
  "password_hash" TEXT,
  "name"          TEXT         NOT NULL,
  "locale"        TEXT,
  "last_login_at" TIMESTAMP(3),
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "academy_users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "academy_users_email_key" ON "academy_users"("email");

-- ─── AcademyUserIdentity ─────────────────────────────────

CREATE TABLE "academy_user_identities" (
  "id"                   TEXT            NOT NULL,
  "provider"             "OAuthProvider" NOT NULL,
  "provider_account_id"  TEXT            NOT NULL,
  "user_id"              TEXT            NOT NULL,
  "email"                TEXT            NOT NULL,
  "email_verified"       BOOLEAN         NOT NULL DEFAULT false,
  "created_at"           TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "academy_user_identities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "academy_user_identities_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "academy_users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "academy_user_identities_provider_provider_account_id_key"
  ON "academy_user_identities"("provider", "provider_account_id");
CREATE INDEX "academy_user_identities_user_id_idx" ON "academy_user_identities"("user_id");

-- ─── Course ──────────────────────────────────────────────

CREATE TABLE "courses" (
  "id"           TEXT           NOT NULL,
  "slug"         TEXT           NOT NULL,
  "title"        JSONB          NOT NULL,
  "description"  JSONB          NOT NULL,
  "cover_image"  TEXT,
  "status"       "CourseStatus" NOT NULL DEFAULT 'draft',
  "order"        INTEGER        NOT NULL DEFAULT 0,
  "published_at" TIMESTAMP(3),
  "created_at"   TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3)   NOT NULL,
  CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "courses_slug_key" ON "courses"("slug");
CREATE INDEX "courses_status_idx" ON "courses"("status");
CREATE INDEX "courses_order_idx"  ON "courses"("order");

-- ─── Lesson ──────────────────────────────────────────────

CREATE TABLE "lessons" (
  "id"               TEXT           NOT NULL,
  "course_id"        TEXT           NOT NULL,
  "slug"             TEXT           NOT NULL,
  "order"            INTEGER        NOT NULL,
  "title"            JSONB          NOT NULL,
  "excerpt"          JSONB          NOT NULL,
  "content"          JSONB          NOT NULL,
  "type"             "LessonType"   NOT NULL DEFAULT 'text',
  "video_url"        TEXT,
  "duration_minutes" INTEGER,
  "status"           "LessonStatus" NOT NULL DEFAULT 'draft',
  "published_at"     TIMESTAMP(3),
  "created_at"       TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3)   NOT NULL,
  CONSTRAINT "lessons_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lessons_course_id_fkey"
    FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "lessons_course_id_slug_key" ON "lessons"("course_id", "slug");
CREATE INDEX "lessons_course_id_order_idx" ON "lessons"("course_id", "order");
CREATE INDEX "lessons_status_idx"          ON "lessons"("status");

-- ─── AcademyEnrollment ───────────────────────────────────
-- Note: granted_by_id references admin_users.id by value (no FK) so the
-- cross-surface dependency stays loose. Null course_id = wildcard "all
-- current + future courses".

CREATE TABLE "academy_enrollments" (
  "id"            TEXT         NOT NULL,
  "user_id"       TEXT         NOT NULL,
  "course_id"     TEXT,
  "granted_by_id" TEXT         NOT NULL,
  "enrolled_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at"    TIMESTAMP(3),
  CONSTRAINT "academy_enrollments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "academy_enrollments_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "academy_users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "academy_enrollments_course_id_fkey"
    FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "academy_enrollments_user_id_course_id_key"
  ON "academy_enrollments"("user_id", "course_id");
CREATE INDEX "academy_enrollments_user_id_idx"             ON "academy_enrollments"("user_id");
CREATE INDEX "academy_enrollments_course_id_idx"           ON "academy_enrollments"("course_id");
CREATE INDEX "academy_enrollments_user_id_revoked_at_idx"  ON "academy_enrollments"("user_id", "revoked_at");

-- ─── AcademyInvitation ───────────────────────────────────

CREATE TABLE "academy_invitations" (
  "id"                   TEXT               NOT NULL,
  "email"                TEXT               NOT NULL,
  "token_hash"           TEXT               NOT NULL,
  "status"               "InvitationStatus" NOT NULL DEFAULT 'PENDING',
  "expires_at"           TIMESTAMP(3)       NOT NULL,
  "accepted_at"          TIMESTAMP(3),
  "accepted_via"         TEXT,
  "accepted_user_id"     TEXT,
  "initial_course_id"    TEXT,
  "invited_by_id"        TEXT,
  "email_sent_at"        TIMESTAMP(3),
  "email_attempts"       INTEGER            NOT NULL DEFAULT 0,
  "email_last_attempt_at" TIMESTAMP(3),
  "resend_email_id"      TEXT,
  "bounced_at"           TIMESTAMP(3),
  "bounce_reason"        TEXT,
  "created_at"           TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"           TIMESTAMP(3)       NOT NULL,
  CONSTRAINT "academy_invitations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "academy_invitations_accepted_user_id_fkey"
    FOREIGN KEY ("accepted_user_id") REFERENCES "academy_users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "academy_invitations_initial_course_id_fkey"
    FOREIGN KEY ("initial_course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "academy_invitations_token_hash_key" ON "academy_invitations"("token_hash");
CREATE INDEX "academy_invitations_email_status_idx"      ON "academy_invitations"("email", "status");
CREATE INDEX "academy_invitations_status_expires_at_idx" ON "academy_invitations"("status", "expires_at");
CREATE INDEX "academy_invitations_invited_by_id_idx"     ON "academy_invitations"("invited_by_id");

-- ─── AcademyPasswordResetToken ───────────────────────────

CREATE TABLE "academy_password_reset_tokens" (
  "id"         TEXT         NOT NULL,
  "token_hash" TEXT         NOT NULL,
  "user_id"    TEXT         NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "used_at"    TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "academy_password_reset_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "academy_password_reset_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "academy_users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "academy_password_reset_tokens_token_hash_key" ON "academy_password_reset_tokens"("token_hash");
CREATE INDEX "academy_password_reset_tokens_user_id_idx"    ON "academy_password_reset_tokens"("user_id");
CREATE INDEX "academy_password_reset_tokens_expires_at_idx" ON "academy_password_reset_tokens"("expires_at");

-- ─── AcademyRevokedToken ─────────────────────────────────

CREATE TABLE "academy_revoked_tokens" (
  "jti"        TEXT         NOT NULL,
  "user_id"    TEXT         NOT NULL,
  "revoked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reason"     TEXT         NOT NULL,
  CONSTRAINT "academy_revoked_tokens_pkey" PRIMARY KEY ("jti")
);
CREATE INDEX "academy_revoked_tokens_user_id_idx"    ON "academy_revoked_tokens"("user_id");
CREATE INDEX "academy_revoked_tokens_revoked_at_idx" ON "academy_revoked_tokens"("revoked_at");
