import { Injectable } from '@nestjs/common';
import { CourseStatus, CourseVisibility, LessonStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Student-side progress tracking. Two writes happen here:
 *   - `markSeen` from the lesson GET path stamps `startedAt` on first
 *     read and bumps `lastSeenAt` on every subsequent read.
 *   - `markCompleted` from the explicit "Marchează ca terminată" button
 *     sets `completedAt` (first write wins — repeat clicks don't move
 *     the clock). It also enforces the same visibility/enrollment gates
 *     the lesson GET path uses so admins can't be fooled into trusting
 *     a completion from someone who couldn't read the lesson.
 *
 * Reads aggregate per-course stats and per-lesson completion state so
 * `CoursesService` can attach them to every student response without
 * re-querying in each mapper.
 */
@Injectable()
export class LessonProgressService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Called from `LessonsService.findForStudent` after the visibility /
   * enrollment check passes. Never throws — a failed side-effect write
   * shouldn't block the read.
   */
  async markSeen(userId: string, lessonId: string): Promise<void> {
    try {
      await this.prisma.lessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId } },
        create: { userId, lessonId },
        update: { lastSeenAt: new Date() },
      });
    } catch {
      // best-effort; the next read will retry
    }
  }

  /**
   * Explicit completion from the "Marchează ca terminată" button.
   * Resolves the course + lesson by slugs, re-runs the same read
   * gate used by `LessonsService.findForStudent`, then sets
   * `completedAt` iff it's still null. Returns the row.
   *
   * Throws { code: 'NOT_FOUND' } by returning `null` — callers
   * translate to 404 at the controller so we don't leak existence.
   */
  async markCompleted(args: {
    userId: string;
    courseSlug: string;
    lessonSlug: string;
  }): Promise<{ completedAt: Date } | null> {
    const course = await this.prisma.course.findUnique({
      where: { slug: args.courseSlug },
      select: { id: true, status: true, visibility: true },
    });
    if (!course || course.status !== CourseStatus.published) return null;

    // Same gate as LessonsService.findForStudent: public visibility skips
    // the enrollment check; `enrolled` visibility requires a matching
    // wildcard or per-course enrollment row.
    if (course.visibility !== CourseVisibility.public) {
      const enrollment = await this.prisma.academyEnrollment.findFirst({
        where: {
          userId: args.userId,
          revokedAt: null,
          OR: [{ courseId: null }, { courseId: course.id }],
        },
        select: { id: true },
      });
      if (!enrollment) return null;
    }

    const lesson = await this.prisma.lesson.findUnique({
      where: { courseId_slug: { courseId: course.id, slug: args.lessonSlug } },
      select: { id: true, status: true },
    });
    if (!lesson || lesson.status !== LessonStatus.published) return null;

    // Upsert keeps a stable `completedAt` across repeat clicks. The
    // `update` branch only touches `completedAt` when it's still null.
    const existing = await this.prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: args.userId, lessonId: lesson.id } },
      select: { completedAt: true },
    });
    const now = new Date();
    if (existing?.completedAt) {
      await this.prisma.lessonProgress.update({
        where: { userId_lessonId: { userId: args.userId, lessonId: lesson.id } },
        data: { lastSeenAt: now },
      });
      return { completedAt: existing.completedAt };
    }
    const row = await this.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: args.userId, lessonId: lesson.id } },
      create: {
        userId: args.userId,
        lessonId: lesson.id,
        completedAt: now,
      },
      update: {
        completedAt: now,
        lastSeenAt: now,
      },
      select: { completedAt: true },
    });
    return { completedAt: row.completedAt! };
  }

  /**
   * Per-course progress stats for a single student. Caller provides the
   * `totalLessons` per course (already computed for `computeResumeLessonSlug`
   * in the courses service) so this only needs one round-trip for the
   * user's progress rows.
   */
  async getStatsForCourses(
    userId: string,
    totals: Map<string, number>,
  ): Promise<
    Map<
      string,
      { totalLessons: number; completedLessons: number; lastSeenAt: Date | null }
    >
  > {
    const map = new Map<
      string,
      { totalLessons: number; completedLessons: number; lastSeenAt: Date | null }
    >();
    for (const [courseId, totalLessons] of totals) {
      map.set(courseId, { totalLessons, completedLessons: 0, lastSeenAt: null });
    }
    if (totals.size === 0) return map;

    const rows = await this.prisma.lessonProgress.findMany({
      where: {
        userId,
        lesson: {
          courseId: { in: Array.from(totals.keys()) },
          status: LessonStatus.published,
        },
      },
      select: {
        completedAt: true,
        lastSeenAt: true,
        lesson: { select: { courseId: true } },
      },
    });
    for (const row of rows) {
      const entry = map.get(row.lesson.courseId);
      if (!entry) continue;
      if (row.completedAt) entry.completedLessons += 1;
      if (!entry.lastSeenAt || row.lastSeenAt > entry.lastSeenAt) {
        entry.lastSeenAt = row.lastSeenAt;
      }
    }
    return map;
  }

  /**
   * The user's progress rows for a single course, keyed by lessonId.
   * Used by `CoursesService.findBySlugForStudent` to stamp `completed`
   * on every lesson in the response and to pick `resumeLessonSlug`.
   */
  async getProgressForCourse(
    userId: string,
    courseId: string,
  ): Promise<Map<string, { startedAt: Date; completedAt: Date | null; lastSeenAt: Date }>> {
    const rows = await this.prisma.lessonProgress.findMany({
      where: { userId, lesson: { courseId } },
      select: {
        lessonId: true,
        startedAt: true,
        completedAt: true,
        lastSeenAt: true,
      },
    });
    const map = new Map<
      string,
      { startedAt: Date; completedAt: Date | null; lastSeenAt: Date }
    >();
    for (const r of rows) {
      map.set(r.lessonId, {
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        lastSeenAt: r.lastSeenAt,
      });
    }
    return map;
  }
}
