-- Reconstructed stub: the original migration file was not in git history.
-- DB introspection confirms `price_history` table and `view_count` column
-- no longer exist, so the migration was fully applied before the file was
-- lost. `IF EXISTS` keeps the SQL idempotent in case it ever re-runs on a
-- fresh environment.

DROP TABLE IF EXISTS "price_history";

ALTER TABLE "properties" DROP COLUMN IF EXISTS "view_count";
