-- Make City.countyId required + scope the name uniqueness to county.
--
-- Prereq: Every row in `cities` must have a non-null `county_id`. The seed
-- in `prisma/seed.ts` (Phase 2) populates it from the source data's
-- `countySlug`. If a production DB has cities with null county_id, run
-- `UPDATE cities SET county_id = <id> WHERE ...` first, or re-seed, before
-- applying this migration.

-- Safety check: abort migration if any city is missing a county.
DO $$
DECLARE
  orphaned INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned FROM "cities" WHERE "county_id" IS NULL;
  IF orphaned > 0 THEN
    RAISE EXCEPTION 'Cannot apply migration: % cities have NULL county_id. Backfill them first (run the updated seed or manually UPDATE) before re-applying.', orphaned;
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
