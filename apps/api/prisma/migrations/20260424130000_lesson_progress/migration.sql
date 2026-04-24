-- CreateTable
CREATE TABLE "academy_lesson_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academy_lesson_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "academy_lesson_progress_user_id_lesson_id_key" ON "academy_lesson_progress"("user_id", "lesson_id");

-- CreateIndex
CREATE INDEX "academy_lesson_progress_user_id_completed_at_idx" ON "academy_lesson_progress"("user_id", "completed_at");

-- CreateIndex
CREATE INDEX "academy_lesson_progress_user_id_last_seen_at_idx" ON "academy_lesson_progress"("user_id", "last_seen_at" DESC);

-- AddForeignKey
ALTER TABLE "academy_lesson_progress" ADD CONSTRAINT "academy_lesson_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "academy_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academy_lesson_progress" ADD CONSTRAINT "academy_lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
