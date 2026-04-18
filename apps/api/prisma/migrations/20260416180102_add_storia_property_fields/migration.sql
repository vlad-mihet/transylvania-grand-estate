-- CreateEnum
CREATE TYPE "HeatingType" AS ENUM ('central_gas', 'centralized', 'block_central', 'electric', 'heat_pump', 'solid_fuel', 'none');

-- CreateEnum
CREATE TYPE "OwnershipType" AS ENUM ('personal', 'company', 'mixed');

-- CreateEnum
CREATE TYPE "WindowType" AS ENUM ('pvc_double', 'pvc_triple', 'wood', 'aluminum', 'mixed');

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "availability_date" TIMESTAMP(3),
ADD COLUMN     "has_ac" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_armored_doors" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_blinds" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_cable_tv" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_fridge" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_intercom" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_interior_staircase" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_internet" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_oven" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_stove" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_washing_machine" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "heating" "HeatingType",
ADD COLUMN     "ownership" "OwnershipType",
ADD COLUMN     "window_type" "WindowType";

-- CreateIndex
CREATE INDEX "properties_heating_idx" ON "properties"("heating");

-- CreateIndex
CREATE INDEX "properties_ownership_idx" ON "properties"("ownership");

-- CreateIndex
CREATE INDEX "properties_availability_date_idx" ON "properties"("availability_date");
