-- AcademyUser soft-disable. Three nullable additions; existing rows
-- stay ACTIVE (suspendedAt IS NULL). No backfill required.
--
-- The strategy/login layer treats:
--   * suspendedAt IS NOT NULL ⇒ login returns 403 SUSPENDED, JWT
--     strategy rejects tokens (admin must reactivate).
--   * iat < tokens_revoked_at ⇒ token rejected as revoked. Cleared
--     only when the user logs back in (refresh issues a fresh iat).
--
-- The index on suspended_at supports admin filters that surface
-- currently-suspended accounts in lists. Cardinality stays low.

ALTER TABLE "academy_users"
  ADD COLUMN "suspended_at"       TIMESTAMP(3),
  ADD COLUMN "suspended_reason"   TEXT,
  ADD COLUMN "tokens_revoked_at"  TIMESTAMP(3);

CREATE INDEX "academy_users_suspended_at_idx"
  ON "academy_users"("suspended_at");
