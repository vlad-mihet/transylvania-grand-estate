-- Phase 2 — Stage 2.0a (Schema Fusion).
-- Identity-pool discriminator added to both AdminUser and AcademyUser.
-- Two values mirror the JWT `realm` claim (already shipped). Agents stay
-- in the admin realm via their AdminUser link — no separate value here.
--
-- Purely additive. `ADD COLUMN ... NOT NULL DEFAULT 'X'` is metadata-only
-- on PG 11+, so this is safe at any size. Rollback = `DROP COLUMN` +
-- `DROP TYPE`. See `phase-2-schema-fusion.md` for the full Phase 2 plan.

-- CreateEnum
CREATE TYPE "Realm" AS ENUM ('admin', 'academy');

-- AlterTable
ALTER TABLE "admin_users" ADD COLUMN "realm" "Realm" NOT NULL DEFAULT 'admin';

-- CreateIndex
CREATE INDEX "admin_users_realm_idx" ON "admin_users"("realm");

-- AlterTable
ALTER TABLE "academy_users" ADD COLUMN "realm" "Realm" NOT NULL DEFAULT 'academy';

-- CreateIndex
CREATE INDEX "academy_users_realm_idx" ON "academy_users"("realm");
