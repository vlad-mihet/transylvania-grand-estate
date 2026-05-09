import { Injectable } from '@nestjs/common';
import { CourseStatus, LessonStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ensureFound } from '../../common/utils/ensure-found.util';
import { paginate } from '../../common/utils/pagination.util';
import { LessonProgressService } from '../progress/lesson-progress.service';
import { computeResumeLessonSlug } from '../progress/resume-lesson.util';
import type {
  AcademyStudentLessonState,
  AcademyStudentProgressRow,
} from '@tge/types/schemas/academy';
import { buildCsvStream } from '../../common/utils/csv-stream';
import type {
  ListAcademyUsersDto,
  UpdateAcademyUserDto,
} from './dto/academy-users.dto';

@Injectable()
export class AcademyUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progress: LessonProgressService,
  ) {}

  async list(query: ListAcademyUsersDto) {
    const { page = 1, limit = 20, search, enrolled, verified, sort } = query;
    const where: Prisma.AcademyUserWhereInput = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (enrolled === true) {
      where.enrollments = { some: { revokedAt: null } };
    } else if (enrolled === false) {
      where.enrollments = { none: { revokedAt: null } };
    }
    if (verified === true) {
      where.emailVerifiedAt = { not: null };
    } else if (verified === false) {
      where.emailVerifiedAt = null;
    }
    const orderBy: Prisma.AcademyUserOrderByWithRelationInput =
      sort === 'oldest'
        ? { createdAt: 'asc' }
        : sort === 'lastLogin'
          ? { lastLoginAt: { sort: 'desc', nulls: 'last' } }
          : { createdAt: 'desc' };

    return paginate(
      (skip, take) =>
        this.prisma.academyUser.findMany({
          where,
          orderBy,
          skip,
          take,
          select: {
            id: true,
            email: true,
            name: true,
            locale: true,
            emailVerifiedAt: true,
            lastLoginAt: true,
            createdAt: true,
            _count: { select: { enrollments: { where: { revokedAt: null } } } },
          },
        }),
      () => this.prisma.academyUser.count({ where }),
      page,
      limit,
    );
  }

  async findById(id: string) {
    return ensureFound(
      this.prisma.academyUser.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          locale: true,
          emailVerifiedAt: true,
          lastLoginAt: true,
          createdAt: true,
          // Soft-disable surfaces on the admin detail page so the admin
          // can see at a glance whether the account is active.
          suspendedAt: true,
          suspendedReason: true,
          enrollments: {
            where: { revokedAt: null },
            select: {
              id: true,
              courseId: true,
              // Expose grantedById so the admin UI can label each row
              // "Self-service" (null) vs. "Granted by X" (admin id).
              grantedById: true,
              enrolledAt: true,
              course: { select: { id: true, slug: true, title: true } },
            },
          },
          identities: {
            select: { id: true, provider: true, email: true, emailVerified: true },
          },
        },
      }),
      'Academy user',
    );
  }

  async update(id: string, dto: UpdateAcademyUserDto) {
    await ensureFound(
      this.prisma.academyUser.findUnique({
        where: { id },
        select: { id: true },
      }),
      'Academy user',
    );
    const data: Prisma.AcademyUserUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.locale !== undefined) data.locale = dto.locale;
    return this.prisma.academyUser.update({ where: { id }, data });
  }

  async remove(id: string) {
    await ensureFound(
      this.prisma.academyUser.findUnique({
        where: { id },
        select: { id: true },
      }),
      'Academy user',
    );
    // Cascade handles identities, enrollments, reset tokens.
    return this.prisma.academyUser.delete({ where: { id } });
  }

  /**
   * Soft-disable an account. Sets `suspendedAt` (used by the JWT
   * strategy + login flow to reject) and `tokensRevokedAt` so any
   * existing access/refresh tokens stop working immediately. The
   * student's data is preserved — reactivate clears `suspendedAt` but
   * leaves `tokensRevokedAt` so old tokens remain dead until the user
   * logs back in.
   */
  async suspend(id: string, reason?: string) {
    await ensureFound(
      this.prisma.academyUser.findUnique({
        where: { id },
        select: { id: true },
      }),
      'Academy user',
    );
    const now = new Date();
    return this.prisma.academyUser.update({
      where: { id },
      data: {
        suspendedAt: now,
        suspendedReason: reason ?? null,
        tokensRevokedAt: now,
      },
      select: {
        id: true,
        suspendedAt: true,
        suspendedReason: true,
      },
    });
  }

  async reactivate(id: string) {
    await ensureFound(
      this.prisma.academyUser.findUnique({
        where: { id },
        select: { id: true },
      }),
      'Academy user',
    );
    // Don't clear tokensRevokedAt — old tokens stay invalid until the
    // user re-authenticates. Refresh issues a fresh iat past the cutoff
    // so the new session works fine.
    return this.prisma.academyUser.update({
      where: { id },
      data: { suspendedAt: null, suspendedReason: null },
      select: { id: true, suspendedAt: true },
    });
  }

  /**
   * Force-complete every published lesson in a course for a single
   * student. Idempotent — re-running on an already-completed course
   * leaves `completedAt` on each row unchanged. Use case: student took
   * the course offline / via a webinar, admin records completion.
   */
  async markCourseProgressComplete(userId: string, courseId: string) {
    await ensureFound(
      this.prisma.academyUser.findUnique({
        where: { id: userId },
        select: { id: true },
      }),
      'Academy user',
    );
    await ensureFound(
      this.prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true },
      }),
      'Course',
    );

    const lessons = await this.prisma.lesson.findMany({
      where: { courseId, status: LessonStatus.published },
      select: { id: true },
    });
    if (lessons.length === 0) {
      return { completed: 0, total: 0 };
    }

    const now = new Date();
    const lessonIds = lessons.map((l) => l.id);

    // Two-step write inside one transaction:
    //   1. Upsert ensures every lesson has a LessonProgress row. The
    //      update branch only touches `lastSeenAt` so first-completion
    //      timestamps stay stable when the admin re-runs this.
    //   2. updateMany backfills `completedAt = now` on rows whose
    //      column is still null — covers both the freshly-created
    //      rows and any pre-existing in-progress rows.
    const newlyCompleted = await this.prisma.$transaction(async (tx) => {
      for (const lessonId of lessonIds) {
        await tx.lessonProgress.upsert({
          where: { userId_lessonId: { userId, lessonId } },
          create: { userId, lessonId, completedAt: now, lastSeenAt: now },
          update: { lastSeenAt: now },
        });
      }
      const result = await tx.lessonProgress.updateMany({
        where: {
          userId,
          lessonId: { in: lessonIds },
          completedAt: null,
        },
        data: { completedAt: now },
      });
      return result.count;
    });

    return { completed: lessons.length, newlyCompleted };
  }

  /**
   * Wipe a student's progress for a single course. Hard delete — no
   * soft-revoke semantics; the user starts the course fresh on their
   * next visit. Wildcard enrollments are untouched (this only deletes
   * progress rows, not access).
   */
  async resetCourseProgress(userId: string, courseId: string) {
    await ensureFound(
      this.prisma.academyUser.findUnique({
        where: { id: userId },
        select: { id: true },
      }),
      'Academy user',
    );
    await ensureFound(
      this.prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true },
      }),
      'Course',
    );
    const result = await this.prisma.lessonProgress.deleteMany({
      where: { userId, lesson: { courseId } },
    });
    return { deleted: result.count };
  }

  /**
   * Streamed CSV export of academy students. Reuses the same `where`
   * shape as `list()` so the export honours the admin's current filters
   * (search/enrolled/verified). Streams in 500-row pages so the process
   * doesn't materialize huge result sets at once.
   */
  exportCsv(query: ListAcademyUsersDto) {
    const { search, enrolled, verified, sort } = query;
    const where: Prisma.AcademyUserWhereInput = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (enrolled === true) {
      where.enrollments = { some: { revokedAt: null } };
    } else if (enrolled === false) {
      where.enrollments = { none: { revokedAt: null } };
    }
    if (verified === true) {
      where.emailVerifiedAt = { not: null };
    } else if (verified === false) {
      where.emailVerifiedAt = null;
    }
    const orderBy: Prisma.AcademyUserOrderByWithRelationInput =
      sort === 'oldest'
        ? { createdAt: 'asc' }
        : sort === 'lastLogin'
          ? { lastLoginAt: { sort: 'desc', nulls: 'last' } }
          : { createdAt: 'desc' };

    const prisma = this.prisma;
    const pageSize = 500;
    async function* rows() {
      let cursor: string | undefined;
      while (true) {
        const batch = await prisma.academyUser.findMany({
          where,
          orderBy,
          take: pageSize,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
          select: {
            id: true,
            email: true,
            name: true,
            locale: true,
            emailVerifiedAt: true,
            lastLoginAt: true,
            createdAt: true,
            _count: {
              select: { enrollments: { where: { revokedAt: null } } },
            },
          },
        });
        if (batch.length === 0) break;
        for (const u of batch) {
          yield [
            u.id,
            u.email,
            u.name,
            u.locale ?? '',
            u.emailVerifiedAt,
            u.lastLoginAt,
            u.createdAt,
            u._count.enrollments,
          ];
        }
        if (batch.length < pageSize) break;
        cursor = batch[batch.length - 1]!.id;
      }
    }
    const filename = `academy-students-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    return buildCsvStream(
      [
        'id',
        'email',
        'name',
        'locale',
        'emailVerifiedAt',
        'lastLoginAt',
        'createdAt',
        'activeEnrollmentCount',
      ],
      rows(),
      filename,
    );
  }

  /**
   * Per-enrollment progress rollup for the admin student-detail page.
   * Wildcard enrollments fan out to every published course; per-course
   * enrollments contribute one row each. Sorted by lastSeenAt desc so
   * recently-active courses surface first; courses the student has
   * never opened fall to the bottom in `Course.order` ascending.
   */
  async getProgressForStudent(
    userId: string,
  ): Promise<AcademyStudentProgressRow[]> {
    await ensureFound(
      this.prisma.academyUser.findUnique({
        where: { id: userId },
        select: { id: true },
      }),
      'Academy user',
    );

    const enrollments = await this.prisma.academyEnrollment.findMany({
      where: { userId, revokedAt: null },
      select: { id: true, courseId: true },
    });
    const wildcardEnrollment = enrollments.find((e) => e.courseId === null);
    const perCourseEnrollmentByCourseId = new Map<string, string>();
    for (const e of enrollments) {
      if (e.courseId !== null) perCourseEnrollmentByCourseId.set(e.courseId, e.id);
    }

    // Candidate course set: wildcard ⇒ every published course; else only
    // the courses the student has explicit per-course access to. Archived
    // and draft courses stay out — admins shouldn't see progress against
    // content the student can't currently open.
    const courseWhere: Prisma.CourseWhereInput = wildcardEnrollment
      ? { status: CourseStatus.published }
      : {
          status: CourseStatus.published,
          id: { in: Array.from(perCourseEnrollmentByCourseId.keys()) },
        };
    if (
      !wildcardEnrollment &&
      perCourseEnrollmentByCourseId.size === 0
    ) {
      return [];
    }

    const courses = await this.prisma.course.findMany({
      where: courseWhere,
      orderBy: { order: 'asc' },
      select: { id: true, slug: true, title: true, order: true },
    });
    if (courses.length === 0) return [];

    const courseIds = courses.map((c) => c.id);

    // Published lesson list per course — needed for both totals and
    // resumeLessonSlug.
    const lessonRows = await this.prisma.lesson.findMany({
      where: { courseId: { in: courseIds }, status: LessonStatus.published },
      orderBy: { order: 'asc' },
      select: { id: true, slug: true, courseId: true },
    });
    const lessonsByCourse = new Map<
      string,
      Array<{ id: string; slug: string }>
    >();
    for (const id of courseIds) lessonsByCourse.set(id, []);
    for (const r of lessonRows) {
      lessonsByCourse.get(r.courseId)?.push({ id: r.id, slug: r.slug });
    }

    const totalsByCourse = new Map<string, number>();
    for (const [id, ls] of lessonsByCourse) totalsByCourse.set(id, ls.length);

    // Aggregate completion stats (totals + lastSeenAt + completed counts).
    const stats = await this.progress.getStatsForCourses(
      userId,
      totalsByCourse,
    );

    // Per-lesson progress rows for this user across all candidate courses,
    // bucketed by courseId. Used to (a) compute resumeLessonSlug, and
    // (b) derive firstSeenAt / lastCompletedAt per course.
    const progressRows = await this.prisma.lessonProgress.findMany({
      where: {
        userId,
        lesson: {
          courseId: { in: courseIds },
          status: LessonStatus.published,
        },
      },
      select: {
        lessonId: true,
        startedAt: true,
        completedAt: true,
        lastSeenAt: true,
        lesson: { select: { courseId: true } },
      },
    });
    const progressByCourse = new Map<
      string,
      Map<string, { completedAt: Date | null; lastSeenAt: Date }>
    >();
    const firstSeenByCourse = new Map<string, Date>();
    const lastCompletedByCourse = new Map<string, Date>();
    for (const id of courseIds) progressByCourse.set(id, new Map());
    for (const r of progressRows) {
      const cid = r.lesson.courseId;
      progressByCourse.get(cid)?.set(r.lessonId, {
        completedAt: r.completedAt,
        lastSeenAt: r.lastSeenAt,
      });
      const firstSeen = firstSeenByCourse.get(cid);
      if (!firstSeen || r.startedAt < firstSeen) {
        firstSeenByCourse.set(cid, r.startedAt);
      }
      if (r.completedAt) {
        const lastCompleted = lastCompletedByCourse.get(cid);
        if (!lastCompleted || r.completedAt > lastCompleted) {
          lastCompletedByCourse.set(cid, r.completedAt);
        }
      }
    }

    const rows: AcademyStudentProgressRow[] = courses.map((c) => {
      const stat = stats.get(c.id) ?? {
        totalLessons: 0,
        completedLessons: 0,
        lastSeenAt: null,
      };
      const completionRate =
        stat.totalLessons === 0
          ? 0
          : Math.round((stat.completedLessons / stat.totalLessons) * 100);
      const firstSeen = firstSeenByCourse.get(c.id) ?? null;
      const lastCompleted = lastCompletedByCourse.get(c.id) ?? null;
      const enrollmentId =
        perCourseEnrollmentByCourseId.get(c.id) ?? null;
      return {
        courseId: c.id,
        slug: c.slug,
        title: c.title as Record<
          'ro' | 'en' | 'fr' | 'de',
          string | undefined
        >,
        totalLessons: stat.totalLessons,
        completedLessons: stat.completedLessons,
        completionRate,
        lastSeenAt: stat.lastSeenAt ? stat.lastSeenAt.toISOString() : null,
        resumeLessonSlug: computeResumeLessonSlug(
          lessonsByCourse.get(c.id) ?? [],
          progressByCourse.get(c.id) ?? new Map(),
        ),
        firstSeenAt: firstSeen ? firstSeen.toISOString() : null,
        lastCompletedAt: lastCompleted ? lastCompleted.toISOString() : null,
        viaWildcard: !enrollmentId && !!wildcardEnrollment,
        enrollmentId,
      };
    });

    // Sort: recently-active first; never-opened fall to course.order.
    rows.sort((a, b) => {
      const aSeen = a.lastSeenAt ? Date.parse(a.lastSeenAt) : -1;
      const bSeen = b.lastSeenAt ? Date.parse(b.lastSeenAt) : -1;
      if (aSeen !== bSeen) return bSeen - aSeen;
      // Tie-break by course list order (already course.order asc).
      return courseIds.indexOf(a.courseId) - courseIds.indexOf(b.courseId);
    });

    return rows;
  }

  /**
   * Per-lesson progress detail for one (student, course) pair. Powers the
   * "View detailed progress" disclosure on the admin student detail page.
   * Returns every published lesson in course order, with the student's
   * progress row attached when one exists.
   */
  async getStudentLessonStates(
    userId: string,
    courseId: string,
  ): Promise<AcademyStudentLessonState[]> {
    await ensureFound(
      this.prisma.academyUser.findUnique({
        where: { id: userId },
        select: { id: true },
      }),
      'Academy user',
    );
    await ensureFound(
      this.prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true },
      }),
      'Course',
    );

    const lessons = await this.prisma.lesson.findMany({
      where: { courseId, status: LessonStatus.published },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        slug: true,
        title: true,
        order: true,
        status: true,
      },
    });
    if (lessons.length === 0) return [];

    const progressRows = await this.prisma.lessonProgress.findMany({
      where: { userId, lessonId: { in: lessons.map((l) => l.id) } },
      select: {
        lessonId: true,
        startedAt: true,
        completedAt: true,
        lastSeenAt: true,
      },
    });
    const progressByLessonId = new Map<
      string,
      { startedAt: Date; completedAt: Date | null; lastSeenAt: Date }
    >();
    for (const r of progressRows) {
      progressByLessonId.set(r.lessonId, {
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        lastSeenAt: r.lastSeenAt,
      });
    }

    return lessons.map((l) => {
      const p = progressByLessonId.get(l.id);
      return {
        lessonId: l.id,
        slug: l.slug,
        title: l.title as Record<
          'ro' | 'en' | 'fr' | 'de',
          string | undefined
        >,
        order: l.order,
        status: l.status,
        startedAt: p ? p.startedAt.toISOString() : null,
        completedAt: p?.completedAt ? p.completedAt.toISOString() : null,
        lastSeenAt: p ? p.lastSeenAt.toISOString() : null,
      };
    });
  }
}
