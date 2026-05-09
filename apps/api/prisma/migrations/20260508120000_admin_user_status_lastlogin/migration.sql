-- AdminUser lifecycle + login activity. All additive: defaults make the
-- migration safe to roll forward without a backfill. Existing rows become
-- ACTIVE with NULL last_login_at / last_seen_at, which the admin UI renders
-- as "—" until the user signs in next.

CREATE TYPE "AdminUserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

ALTER TABLE "admin_users"
  ADD COLUMN "status"        "AdminUserStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "disabled_at"   TIMESTAMP(3),
  ADD COLUMN "last_login_at" TIMESTAMP(3),
  ADD COLUMN "last_seen_at"  TIMESTAMP(3);

CREATE INDEX "admin_users_status_idx" ON "admin_users"("status");

-- Invitation.name carries the display name for non-AGENT invites (which
-- have no Agent profile to derive it from). AGENT invitations leave it
-- NULL and continue to derive name from the linked Agent at accept time.
ALTER TABLE "invitations"
  ADD COLUMN "name" TEXT;
