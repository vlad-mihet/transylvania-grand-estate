/**
 * Pure helper extracted from `CoursesService` so admin paths (per-student
 * progress reporting) and student paths (dashboard / catalog / course
 * detail) can share the same "where should the Continuă button land?"
 * algorithm without copy-paste drift.
 *
 * Strategy:
 *   1. Most-recently-seen in-progress lesson (started but not completed).
 *   2. First never-opened lesson in published order.
 *   3. First lesson of the course (everything is already complete).
 * Returns null only when the course has zero published lessons.
 */
export function computeResumeLessonSlug(
  lessons: Array<{ id: string; slug: string }>,
  progress: Map<string, { completedAt: Date | null; lastSeenAt: Date }>,
): string | null {
  if (lessons.length === 0) return null;

  let mostRecentInProgress: { slug: string; lastSeenAt: Date } | null = null;
  for (const l of lessons) {
    const row = progress.get(l.id);
    if (!row) continue;
    if (row.completedAt) continue;
    if (
      !mostRecentInProgress ||
      row.lastSeenAt > mostRecentInProgress.lastSeenAt
    ) {
      mostRecentInProgress = { slug: l.slug, lastSeenAt: row.lastSeenAt };
    }
  }
  if (mostRecentInProgress) return mostRecentInProgress.slug;

  for (const l of lessons) {
    if (!progress.has(l.id)) return l.slug;
  }

  return lessons[0].slug;
}
