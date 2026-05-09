-- Lesson attachments: files (PDF, ZIP, slide decks, etc.) admins attach to
-- a lesson so students can download supporting materials. Storage is
-- delegated to UploadsService; this row carries the metadata + the
-- key/path the service uses to fetch a signed URL.
--
-- New table only. No backfill. uploaded_by_id stores AdminUser.id
-- without an FK because AcademyUser and AdminUser are separate pools
-- (cross-realm convention; mirrors AcademyEnrollment.granted_by_id).

CREATE TABLE "lesson_attachments" (
  "id"             TEXT      NOT NULL,
  "lesson_id"      TEXT      NOT NULL,
  "filename"       TEXT      NOT NULL,
  "mime_type"      TEXT      NOT NULL,
  "size_bytes"     INTEGER   NOT NULL,
  "storage_path"   TEXT      NOT NULL,
  "sort_order"     INTEGER   NOT NULL DEFAULT 0,
  "uploaded_by_id" TEXT,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "lesson_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lesson_attachments_lesson_id_sort_order_idx"
  ON "lesson_attachments"("lesson_id", "sort_order");

ALTER TABLE "lesson_attachments"
  ADD CONSTRAINT "lesson_attachments_lesson_id_fkey"
  FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
