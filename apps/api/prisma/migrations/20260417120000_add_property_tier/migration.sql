-- Add PropertyTier enum and tier column to properties.
-- Backfills existing rows: price < 1_000_000 EUR → 'affordable', else 'luxury'.
-- New rows default to 'luxury' at the model level.

-- CreateEnum
CREATE TYPE "PropertyTier" AS ENUM ('luxury', 'affordable');

-- AlterTable
ALTER TABLE "properties" ADD COLUMN "tier" "PropertyTier" NOT NULL DEFAULT 'luxury';

-- Backfill: cheaper listings become the Reveria (affordable) tier
UPDATE "properties" SET "tier" = 'affordable' WHERE "price" < 1000000;

-- CreateIndex
CREATE INDEX "properties_tier_idx" ON "properties"("tier");
