-- Make City.countyId required + scope the name uniqueness to county.
--
-- Prereq: Every row in `cities` must have a non-null `county_id`. The seed
-- in `prisma/seed.ts` (Phase 2) populates it from the source data's
-- `countySlug`. This migration self-heals for the 5 canonical seed cities
-- if their counties are missing or the join wasn't performed yet.

-- Ensure the 5 canonical counties exist (idempotent on slug).
INSERT INTO "counties" ("id", "name", "slug", "code", "latitude", "longitude", "property_count", "created_at", "updated_at")
VALUES
  (gen_random_uuid()::text, 'Cluj',   'cluj',   'CJ', 46.77, 23.60, 0, NOW(), NOW()),
  (gen_random_uuid()::text, 'Bihor',  'bihor',  'BH', 47.05, 21.92, 0, NOW(), NOW()),
  (gen_random_uuid()::text, 'Timiș',  'timis',  'TM', 45.75, 21.23, 0, NOW(), NOW()),
  (gen_random_uuid()::text, 'Brașov', 'brasov', 'BV', 45.65, 25.61, 0, NOW(), NOW()),
  (gen_random_uuid()::text, 'Sibiu',  'sibiu',  'SB', 45.80, 24.15, 0, NOW(), NOW())
ON CONFLICT ("slug") DO NOTHING;

-- Backfill cities.county_id for the canonical 5 seed cities via slug mapping.
UPDATE "cities" c
SET "county_id" = co."id"
FROM "counties" co
WHERE c."county_id" IS NULL AND (
    (c."slug" = 'cluj-napoca' AND co."slug" = 'cluj')   OR
    (c."slug" = 'oradea'      AND co."slug" = 'bihor')  OR
    (c."slug" = 'timisoara'   AND co."slug" = 'timis')  OR
    (c."slug" = 'brasov'      AND co."slug" = 'brasov') OR
    (c."slug" = 'sibiu'       AND co."slug" = 'sibiu')
);

-- Safety check: any city still orphaned after the backfill requires
-- manual intervention. Aborts the transaction (rolled back atomically).
DO $$
DECLARE
  orphaned INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned FROM "cities" WHERE "county_id" IS NULL;
  IF orphaned > 0 THEN
    RAISE EXCEPTION 'Cannot apply migration: % cities have NULL county_id after backfill. Manual intervention required.', orphaned;
  END IF;
END $$;

-- DropForeignKey (was ON DELETE SET NULL; replacing with RESTRICT)
ALTER TABLE "cities" DROP CONSTRAINT "cities_county_id_fkey";

-- AlterTable: make county_id NOT NULL
ALTER TABLE "cities" ALTER COLUMN "county_id" SET NOT NULL;

-- DropIndex: remove the global name uniqueness
DROP INDEX "cities_name_key";

-- CreateIndex: name is now unique per county (allows same city name in
-- different județe, which Romania genuinely has)
CREATE UNIQUE INDEX "cities_name_county_id_key" ON "cities"("name", "county_id");

-- AddForeignKey: re-add with ON DELETE RESTRICT (can't delete a county
-- while cities still reference it)
ALTER TABLE "cities" ADD CONSTRAINT "cities_county_id_fkey" FOREIGN KEY ("county_id") REFERENCES "counties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
