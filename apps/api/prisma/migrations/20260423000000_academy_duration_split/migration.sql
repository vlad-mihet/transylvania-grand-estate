-- Split Lesson duration into two semantically distinct fields.
-- Text lessons derive reading time from word count at read time (not
-- persisted). Video lessons persist a watched-duration in seconds, later
-- populated via oEmbed scraping.
--
-- Safe to drop the old column: the 24 seeded rows are all text lessons,
-- so their `duration_minutes` values are derived from markdown word count
-- and will be recomputed at read time. No video lessons exist yet.

ALTER TABLE "lessons" ADD COLUMN "video_duration_seconds" INTEGER;

-- Migrate any pre-existing video rows (currently none, but the UPDATE is
-- safe and idempotent) from minutes to seconds before dropping the column.
UPDATE "lessons"
SET "video_duration_seconds" = "duration_minutes" * 60
WHERE "type" = 'video' AND "duration_minutes" IS NOT NULL;

ALTER TABLE "lessons" DROP COLUMN "duration_minutes";
