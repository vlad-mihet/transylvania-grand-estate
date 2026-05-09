-- Phase 5: per-entity unpublished draft snapshots for the Contentful-style
-- editor. Each `draft` column carries a JSON snapshot of the entry's
-- localized fields when the editor saves a draft; the application's
-- update services (apps/api/src/common/utils/entry-draft.ts) clear the
-- column on publish. All columns are nullable so this migration is
-- non-blocking and safe to roll back.

-- AlterTable
ALTER TABLE "agents" ADD COLUMN     "draft" JSONB;

-- AlterTable
ALTER TABLE "articles" ADD COLUMN     "draft" JSONB;

-- AlterTable
ALTER TABLE "cities" ADD COLUMN     "draft" JSONB;

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "draft" JSONB;

-- AlterTable
ALTER TABLE "developers" ADD COLUMN     "draft" JSONB;

-- AlterTable
ALTER TABLE "lessons" ADD COLUMN     "draft" JSONB;

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "draft" JSONB;

-- AlterTable
ALTER TABLE "testimonials" ADD COLUMN     "draft" JSONB;
