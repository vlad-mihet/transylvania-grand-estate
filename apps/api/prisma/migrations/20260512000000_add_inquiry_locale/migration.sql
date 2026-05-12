-- Phase 4a — Inquiry locale persistence.
--
-- Adds a `locale` column to capture the submitter's UI language at
-- submission time. Previously this was derived ad-hoc via regex against
-- `source_url` at email-send time (see `inquiries.service.ts`
-- `deriveSubmitterLocale`) — the derivation is brittle and the result was
-- never stored, so admins replying to old inquiries had no record of the
-- submitter's language.
--
-- Nullable with a `ro` default so the migration is safe to apply against a
-- populated table. PR 4c (after one release soak) will tighten this to
-- NOT NULL once the rolling deploy is complete and every new row carries
-- an explicit locale.
--
-- Backfill mirrors `deriveSubmitterLocale`'s regex
-- (/\/(en|ro|fr|de)(?:\/|$|\?)/) using four CASE branches. PostgreSQL's
-- POSIX regex (`~`) is sufficient; we don't use the `regexp_matches`
-- capture variant because it returns a text[] requiring extra unnesting.
ALTER TABLE "inquiries" ADD COLUMN "locale" VARCHAR(8) DEFAULT 'ro';

UPDATE "inquiries" SET "locale" = CASE
  WHEN "source_url" ~ '/en(?:/|$|\?)' THEN 'en'
  WHEN "source_url" ~ '/ro(?:/|$|\?)' THEN 'ro'
  WHEN "source_url" ~ '/fr(?:/|$|\?)' THEN 'fr'
  WHEN "source_url" ~ '/de(?:/|$|\?)' THEN 'de'
  ELSE 'ro'
END
WHERE "locale" IS NULL OR "locale" = 'ro';
