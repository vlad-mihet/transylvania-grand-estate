-- Wave B + C foundation for the contact-flow audit (2026-05-10):
--   site_id     brand isolation primitive (TGE_LUXURY | REVERY | ACADEMY)
--   app         originating surface (landing | revery | academy) — feeds the
--               unified queue + admin filter chips
--   deleted_at  soft-delete; DELETE flips this column instead of dropping
--
-- All three columns are nullable on existing rows so the migration is safe
-- to apply against a populated table. Backfill heuristic uses the existing
-- `source` string ("tge-…" | "revery-…" | "academy-…") because the brand
-- prefix has been stamped via useInquirySubmission since Wave A. Rows with
-- NULL/unknown source default to TGE_LUXURY + landing — the historic
-- assumption when the source column was first added.
ALTER TABLE "inquiries"
  ADD COLUMN "site_id"    VARCHAR(20),
  ADD COLUMN "app"        VARCHAR(20),
  ADD COLUMN "deleted_at" TIMESTAMP(3);

UPDATE "inquiries" SET
  "site_id" = CASE
    WHEN "source" LIKE 'revery-%'  THEN 'REVERY'
    WHEN "source" LIKE 'academy-%' THEN 'ACADEMY'
    ELSE 'TGE_LUXURY'
  END,
  "app" = CASE
    WHEN "source" LIKE 'revery-%'  THEN 'revery'
    WHEN "source" LIKE 'academy-%' THEN 'academy'
    ELSE 'landing'
  END
WHERE "site_id" IS NULL;

CREATE INDEX "inquiries_site_id_idx"    ON "inquiries"("site_id");
CREATE INDEX "inquiries_deleted_at_idx" ON "inquiries"("deleted_at");
