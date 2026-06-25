-- CRM → platform listing sync (Phase 1, first provider: REBS).
--
-- Property gains CRM-agnostic provenance + an ingestion-state column that is
-- ORTHOGONAL to the commercial `status` enum:
--   source             originating adapter ('rebs' | NULL = native/admin row)
--   external_id        adapter's stable id (REBS internal_id, stringified)
--   source_modified_at CRM's own last-modified ts — change detection + media gate
--   unpublished_at     feed dropped the listing OR import quarantined (unknown
--                      city); public reads filter IS NULL, admin sees all.
--                      Sync never writes status/tier — those stay human-owned.
--   needs_translation  imported RO-only content mirrored into `en`; flags rows a
--                      later translation pass backfills.
--
-- All columns nullable / defaulted so the migration is safe against the
-- populated table; existing rows are native (source = NULL) and unconstrained.
ALTER TABLE "properties"
  ADD COLUMN "source"             TEXT,
  ADD COLUMN "external_id"        TEXT,
  ADD COLUMN "source_modified_at" TIMESTAMP(3),
  ADD COLUMN "unpublished_at"     TIMESTAMP(3),
  ADD COLUMN "needs_translation"  BOOLEAN NOT NULL DEFAULT false;

-- Upsert key for imported listings. Both columns nullable: Postgres treats
-- NULLs as distinct, so the unbounded set of native rows (source = NULL) never
-- collides, while (source, external_id) is unique per CRM.
CREATE UNIQUE INDEX "properties_source_external_id_key"
  ON "properties"("source", "external_id");
CREATE INDEX "properties_source_idx"          ON "properties"("source");
CREATE INDEX "properties_unpublished_at_idx"  ON "properties"("unpublished_at");

-- PropertyImage: self-hosting bookkeeping for mirrored CRM media.
--   source_url   original (hotlink-forbidden) CRM URL — dedupe key; re-download
--                only when it changes.
--   storage_key  R2/local object key — kept for direct cleanup on removal.
ALTER TABLE "property_images"
  ADD COLUMN "source_url"  TEXT,
  ADD COLUMN "storage_key" TEXT;

CREATE INDEX "property_images_property_id_source_url_idx"
  ON "property_images"("property_id", "source_url");
