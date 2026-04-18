-- Add nullable FK columns for Property → City and Property → Neighborhood.
-- The denormalized `city`, `city_slug`, and `neighborhood` string columns are
-- left in place as shadow columns; application code still reads them until
-- consumers are migrated to use the relations.

-- AlterTable
ALTER TABLE "properties" ADD COLUMN "city_id" TEXT;
ALTER TABLE "properties" ADD COLUMN "neighborhood_id" TEXT;

-- Backfill city_id from the existing city_slug denormalized column
UPDATE "properties" p
SET "city_id" = c."id"
FROM "cities" c
WHERE p."city_slug" = c."slug";

-- Backfill neighborhood_id by matching (city_id, neighborhood-name) against
-- the neighborhoods table. Names are compared case-insensitively; rows with
-- no matching neighborhood simply remain NULL.
UPDATE "properties" p
SET "neighborhood_id" = n."id"
FROM "neighborhoods" n
WHERE p."city_id" = n."city_id"
  AND LOWER(p."neighborhood") = LOWER(n."name");

-- CreateIndex
CREATE INDEX "properties_city_id_idx" ON "properties"("city_id");
CREATE INDEX "properties_neighborhood_id_idx" ON "properties"("neighborhood_id");

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "properties" ADD CONSTRAINT "properties_neighborhood_id_fkey" FOREIGN KEY ("neighborhood_id") REFERENCES "neighborhoods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
