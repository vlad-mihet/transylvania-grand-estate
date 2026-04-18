-- CreateEnum
CREATE TYPE "Furnishing" AS ENUM ('unfurnished', 'semi_furnished', 'furnished', 'luxury');

-- CreateEnum
CREATE TYPE "ConstructionMaterial" AS ENUM ('brick', 'concrete', 'bca', 'wood', 'stone', 'mixed');

-- CreateEnum
CREATE TYPE "PropertyCondition" AS ENUM ('new_build', 'renovated', 'good', 'needs_renovation', 'under_construction');

-- CreateEnum
CREATE TYPE "SellerType" AS ENUM ('private_seller', 'agency', 'developer');

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "condition" "PropertyCondition",
ADD COLUMN     "floor" INTEGER,
ADD COLUMN     "furnishing" "Furnishing",
ADD COLUMN     "has_balcony" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_elevator" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_garage" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_parking" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_separate_kitchen" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_storage" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_terrace" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "material" "ConstructionMaterial",
ADD COLUMN     "seller_type" "SellerType";

-- CreateIndex
CREATE INDEX "properties_furnishing_idx" ON "properties"("furnishing");

-- CreateIndex
CREATE INDEX "properties_material_idx" ON "properties"("material");

-- CreateIndex
CREATE INDEX "properties_condition_idx" ON "properties"("condition");

-- CreateIndex
CREATE INDEX "properties_seller_type_idx" ON "properties"("seller_type");

-- CreateIndex
CREATE INDEX "properties_floor_idx" ON "properties"("floor");
