import { Injectable } from '@nestjs/common';
import { CourseStatus, InvitationStatus, LessonStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AcademyOverview } from '@tge/types/schemas/academy';

/**
 * Glance-surface aggregations behind `GET /admin/academy/overview`. Every
 * query here is a count or a small `take`-bounded scan so the dashboard
 * stays cheap regardless of academy size. Anything heavier (cohort
 * analysis, time-series) belongs in a dedicated reporting endpoint.
 */
@Injectable()
export class AcademyOverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(): Promise<AcademyOverview> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      mau30d,
      activeEnrollments,
      newStudentsLast7d,
      pendingInvitations,
      topCoursesAggregate,
      recentProgressRows,
    ] = await Promise.all([
      // MAU = distinct AcademyUsers with a login in the last 30 days. Picks
      // the cheaper signal over a `progress.lastSeenAt` scan; the academy
      // refreshes the access token on most opens, so lastLoginAt tracks
      // active usage closely enough for a dashboard tile.
      this.prisma.academyUser.count({
        where: { lastLoginAt: { gte: thirtyDaysAgo } },
      }),
      // Active enrollments: every non-revoked row, including wildcards.
      this.prisma.academyEnrollment.count({ where: { revokedAt: null } }),
      this.prisma.academyUser.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.academyInvitation.count({
        where: { status: InvitationStatus.PENDING },
      }),
      // Top courses by completion count. Dashboard surface — keep it tight.
      this.prisma.lessonProgress.groupBy({
        by: ['lessonId'],
        where: {
          completedAt: { not: null },
          lesson: { status: LessonStatus.published },
        },
        _count: { lessonId: true },
      }),
      // Recent activity: latest LessonProgress writes with completion or
      // start state. Limited to 20 — the dashboard renders the top 10.
      this.prisma.lessonProgress.findMany({
        where: {
          lesson: { status: LessonStatus.published },
          OR: [
            { completedAt: { not: null } },
            { startedAt: { gte: thirtyDaysAgo } },
          ],
        },
        orderBy: [
          { completedAt: { sort: 'desc', nulls: 'last' } },
          { startedAt: 'desc' },
        ],
        take: 20,
        select: {
          startedAt: true,
          completedAt: true,
          user: { select: { id: true, name: true } },
          lesson: {
            select: {
              id: true,
              slug: true,
              course: {
                select: {
                  id: true,
                  slug: true,
                  title: true,
                  status: true,
                },
              },
            },
          },
        },
      }),
    ]);

    // Roll lesson-level completion counts up to the course level so the
    // tile shows whole-course wins, not "lesson 3 of fundamentals" noise.
    const lessonIds = topCoursesAggregate.map((row) => row.lessonId);
    const lessonsWithCourse = lessonIds.length
      ? await this.prisma.lesson.findMany({
          where: { id: { in: lessonIds } },
          select: { id: true, courseId: true },
        })
      : [];
    const courseIdByLesson = new Map<string, string>();
    for (const l of lessonsWithCourse) {
      courseIdByLesson.set(l.id, l.courseId);
    }
    const completedByCourse = new Map<string, number>();
    for (const row of topCoursesAggregate) {
      const courseId = courseIdByLesson.get(row.lessonId);
      if (!courseId) continue;
      completedByCourse.set(
        courseId,
        (completedByCourse.get(courseId) ?? 0) + row._count.lessonId,
      );
    }
    const topCourseIds = Array.from(completedByCourse.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);

    let topCoursesByCompletion: AcademyOverview['topCoursesByCompletion'] =
      [];
    if (topCourseIds.length) {
      const [courses, enrolledRows] = await Promise.all([
        this.prisma.course.findMany({
          where: {
            id: { in: topCourseIds },
            status: CourseStatus.published,
          },
          select: { id: true, slug: true, title: true },
        }),
        // Enrolled count per course = distinct users with an active
        // matching enrollment OR an active wildcard (which fans out).
        this.prisma.academyEnrollment.findMany({
          where: {
            revokedAt: null,
            OR: [{ courseId: null }, { courseId: { in: topCourseIds } }],
          },
          select: { userId: true, courseId: true },
        }),
      ]);
      const wildcardUsers = new Set<string>();
      const perCourseUsers = new Map<string, Set<string>>();
      for (const id of topCourseIds) perCourseUsers.set(id, new Set());
      for (const row of enrolledRows) {
        if (row.courseId === null) wildcardUsers.add(row.userId);
        else perCourseUsers.get(row.courseId)?.add(row.userId);
      }
      const enrolledByCourse = new Map<string, number>();
      for (const id of topCourseIds) {
        const set = new Set(perCourseUsers.get(id) ?? []);
        for (const u of wildcardUsers) set.add(u);
        enrolledByCourse.set(id, set.size);
      }
      topCoursesByCompletion = courses
        .map((c) => {
          const completedCount = completedByCourse.get(c.id) ?? 0;
          const enrolledCount = enrolledByCourse.get(c.id) ?? 0;
          const completionRate =
            enrolledCount === 0
              ? 0
              : Math.round((completedCount / enrolledCount) * 100);
          return {
            courseId: c.id,
            slug: c.slug,
            title: c.title as Record<
              'ro' | 'en' | 'fr' | 'de',
              string | undefined
            >,
            completedCount,
            enrolledCount,
            completionRate,
          };
        })
        .sort((a, b) => b.completedCount - a.completedCount);
    }

    // Recent activity: dedup so the same user doesn't take up multiple
    // rows in the feed (last event per user, completed > started). Then
    // take the top 10. Skip rows whose course was unpublished/archived
    // since the dashboard only links to live courses.
    type ActivityRow = AcademyOverview['recentActivity'][number];
    const seen = new Set<string>();
    const activity: ActivityRow[] = [];
    for (const row of recentProgressRows) {
      const courseStatus = row.lesson.course.status;
      if (courseStatus !== CourseStatus.published) continue;
      const key = `${row.user.id}:${row.lesson.course.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const at = row.completedAt ?? row.startedAt;
      activity.push({
        studentId: row.user.id,
        studentName: row.user.name,
        kind: row.completedAt ? 'completed' : 'started',
        courseId: row.lesson.course.id,
        courseSlug: row.lesson.course.slug,
        courseTitle: row.lesson.course.title as Record<
          'ro' | 'en' | 'fr' | 'de',
          string | undefined
        >,
        lessonId: row.lesson.id,
        lessonSlug: row.lesson.slug,
        at: at.toISOString(),
      });
      if (activity.length >= 10) break;
    }

    return {
      mau30d,
      activeEnrollments,
      newStudentsLast7d,
      pendingInvitations,
      topCoursesByCompletion,
      recentActivity: activity,
    };
  }
}
