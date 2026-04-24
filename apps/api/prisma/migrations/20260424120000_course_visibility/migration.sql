-- CreateEnum
CREATE TYPE "CourseVisibility" AS ENUM ('public', 'enrolled');

-- AlterTable
ALTER TABLE "courses" ADD COLUMN "visibility" "CourseVisibility" NOT NULL DEFAULT 'enrolled';

-- CreateIndex
CREATE INDEX "courses_visibility_status_idx" ON "courses"("visibility", "status");
