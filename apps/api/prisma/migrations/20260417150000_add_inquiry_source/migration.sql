-- AlterTable
ALTER TABLE "inquiries"
  ADD COLUMN "source" VARCHAR(120),
  ADD COLUMN "source_url" VARCHAR(500);

-- CreateIndex
CREATE INDEX "inquiries_source_idx" ON "inquiries"("source");
