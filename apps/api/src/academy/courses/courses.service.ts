import { ConflictException, Injectable } from '@nestjs/common';
import { CourseStatus, CourseVisibility, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadsService } from '../../uploads/uploads.service';
import { ensureFound } from '../../common/utils/ensure-found.util';
import { ensureSlugUnique } from '../../common/utils/ensure-slug-unique.util';
import { toJson } from '../../common/utils/prisma-json';
import { paginate } from '../../common/utils/pagination.util';
import type { CreateCourseDto, UpdateCourseDto, QueryCourseDto } from './dto/courses.dto';

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
  ) {}

  /**
   * Admin list. Returns full course rows — the student-facing list method
   * (`findAllForStudent`) filters by enrollment and status.
   */
  async findAll(query: QueryCourseDto) {
    const { page = 1, limit = 12, status, search, sort } = query;
    const where: Prisma.CourseWhereInput = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { path: ['ro'], string_contains: search } },
        { title: { path: ['en'], string_contains: search } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }
    const orderBy: Prisma.CourseOrderByWithRelationInput =
      sort === 'newest'
        ? { createdAt: 'desc' }
        : sort === 'oldest'
          ? { createdAt: 'asc' }
          : { order: 'asc' };
    return paginate(
      (skip, take) =>
        this.prisma.course.findMany({
          where,
          orderBy,
          skip,
          take,
          include: { _count: { select: { lessons: true } } },
        }),
      () => this.prisma.course.count({ where }),
      page,
      limit,
    );
  }

  async findById(id: string) {
    return ensureFound(
      this.prisma.course.findUnique({
        where: { id },
        include: { _count: { select: { lessons: true } } },
      }),
      'Course',
    );
  }

  async findBySlug(slug: string) {
    return ensureFound(
      this.prisma.course.findUnique({
        where: { slug },
        include: { _count: { select: { lessons: true } } },
      }),
      'Course',
    );
  }

  /**
   * Student list (enrolled): only published courses where the user has an
   * active enrollment (global-wildcard row OR a row targeting this specific
   * course). Wildcard takes precedence so we never skip a course the user
   * should see. Public-visibility courses are NOT returned here — they live
   * on the dedicated catalog endpoint so the dashboard can cleanly separate
   * "what you're enrolled in" from "what you could browse".
   *
   * Each row carries an `enrolled` flag (always true here, included for
   * response-shape symmetry with catalog) and `canUnenroll` so the dashboard
   * can render the "Elimină din lista mea" menu only for self-service rows.
   */
  async findAllForStudent(userId: string) {
    const hasGlobal = await this.prisma.academyEnrollment.findFirst({
      where: { userId, courseId: null, revokedAt: null },
      select: { id: true },
    });
    const where: Prisma.CourseWhereInput = {
      status: CourseStatus.published,
    };
    if (!hasGlobal) {
      where.enrollments = {
        some: { userId, revokedAt: null },
      };
    }
    const courses = await this.prisma.course.findMany({
      where,
      orderBy: [{ order: 'asc' }, { publishedAt: 'desc' }],
      include: { _count: { select: { lessons: { where: { status: 'published' } } } } },
    });
    const state = await this.computeEnrollmentState(
      userId,
      courses.map((c) => c.id),
    );
    return courses.map((c) => ({
      ...c,
      enrolled: true,
      canUnenroll: state.get(c.id)?.canUnenroll ?? false,
    }));
  }

  /**
   * Public catalog: published courses flagged `visibility: public`. Any
   * authenticated academy user can list them; no enrollment required. Used
   * by the academy `/catalog` page so new signups (and admin-invited users
   * with narrow grants) can discover freely readable content.
   *
   * Each row carries an `enrolled` flag so the UI can surface an `Înscris`
   * badge and hide the enroll button for courses already on the user's
   * dashboard. A wildcard enrollment counts as enrolled for every course.
   */
  async findAllPublic(userId: string) {
    const courses = await this.prisma.course.findMany({
      where: {
        status: CourseStatus.published,
        visibility: CourseVisibility.public,
      },
      orderBy: [{ order: 'asc' }, { publishedAt: 'desc' }],
      include: { _count: { select: { lessons: { where: { status: 'published' } } } } },
    });
    const state = await this.computeEnrollmentState(
      userId,
      courses.map((c) => c.id),
    );
    return courses.map((c) => {
      const s = state.get(c.id);
      return {
        ...c,
        enrolled: s?.enrolled ?? false,
        canUnenroll: s?.canUnenroll ?? false,
      };
    });
  }

  async findBySlugForStudent(userId: string, slug: string) {
    const course = await this.prisma.course.findUnique({
      where: { slug },
      include: {
        lessons: {
          where: { status: 'published' },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            slug: true,
            order: true,
            title: true,
            excerpt: true,
            // content is needed to compute readingTimeMinutes at serve
            // time. It's also lesson markdown for the same user, so the
            // cost-vs-value trade is already settled by the lesson-detail
            // read — pulling it on the list view adds a few KB per course.
            content: true,
            type: true,
            videoDurationSeconds: true,
            publishedAt: true,
          },
        },
      },
    });
    if (!course || course.status !== CourseStatus.published) {
      return null;
    }
    // Public-visibility courses bypass the enrollment lookup entirely —
    // anyone with a valid academy JWT can read them. For `enrolled` courses
    // we still require the user to have an active matching enrollment.
    const canRead =
      course.visibility === CourseVisibility.public ||
      (await this.userCanRead(userId, course.id));
    if (!canRead) return null;
    const state = await this.computeEnrollmentState(userId, [course.id]);
    const s = state.get(course.id);
    return {
      ...course,
      enrolled: s?.enrolled ?? false,
      canUnenroll: s?.canUnenroll ?? false,
    };
  }

  async create(dto: CreateCourseDto) {
    await ensureSlugUnique(dto.slug, 'Course', (slug) =>
      this.prisma.course.findUnique({
        where: { slug },
        select: { id: true },
      }),
    );
    const nextOrder =
      dto.order ?? (await this.nextCourseOrder());
    return this.prisma.course.create({
      data: {
        slug: dto.slug,
        title: toJson(dto.title),
        description: toJson(dto.description),
        coverImage: dto.coverImage ?? null,
        visibility: dto.visibility ?? CourseVisibility.enrolled,
        order: nextOrder,
      },
    });
  }

  async update(id: string, dto: UpdateCourseDto) {
    await this.ensureExists(id);
    const data: Prisma.CourseUpdateInput = {};
    if (dto.slug !== undefined) {
      if (dto.slug !== (await this.slugOf(id))) {
        await ensureSlugUnique(dto.slug, 'Course', (slug) =>
          this.prisma.course.findUnique({
            where: { slug },
            select: { id: true },
          }),
        );
      }
      data.slug = dto.slug;
    }
    if (dto.title !== undefined) data.title = toJson(dto.title);
    if (dto.description !== undefined)
      data.description = toJson(dto.description);
    if (dto.coverImage !== undefined) data.coverImage = dto.coverImage;
    if (dto.visibility !== undefined) data.visibility = dto.visibility;
    if (dto.order !== undefined) data.order = dto.order;
    if (dto.status !== undefined) {
      data.status = dto.status;
      // Transition bookkeeping: stamp publishedAt on first draft→published
      // flip so list sorts remain sensible.
      if (dto.status === CourseStatus.published && dto.publishedAt === undefined) {
        data.publishedAt = new Date();
      }
    }
    if (dto.publishedAt !== undefined) {
      data.publishedAt = dto.publishedAt ? new Date(dto.publishedAt) : null;
    }
    return this.prisma.course.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    // Cascade takes out lessons + enrollments targeting this course.
    return this.prisma.course.delete({ where: { id } });
  }

  /**
   * Upload (or replace) the cover image for a course. Stores under the
   * `academy/courses/:id/` prefix in R2 so lifecycle policies and cost
   * attribution can target academy assets without touching property
   * inventory. Replaces any previous image — deleting the old file from
   * storage is a best-effort cleanup; a leftover object costs a few
   * bytes, swallowed failures don't block the happy path.
   */
  async setCoverImage(id: string, file: Express.Multer.File) {
    await this.ensureExists(id);
    const previous = await this.prisma.course.findUnique({
      where: { id },
      select: { coverImage: true },
    });
    const result = await this.uploads.uploadFile(
      file,
      `academy/courses/${id}`,
    );
    const updated = await this.prisma.course.update({
      where: { id },
      data: { coverImage: result.publicUrl },
    });
    if (previous?.coverImage) {
      const oldPath = this.extractFilePathFromUrl(previous.coverImage);
      if (oldPath) {
        await this.uploads.deleteFile(oldPath).catch(() => undefined);
      }
    }
    return { course: updated, upload: result };
  }

  /**
   * Clear the cover image. Keeps the course row intact — just drops the
   * URL and (best-effort) removes the backing object.
   */
  async clearCoverImage(id: string) {
    await this.ensureExists(id);
    const existing = await this.prisma.course.findUnique({
      where: { id },
      select: { coverImage: true },
    });
    if (!existing?.coverImage) {
      return { ok: true };
    }
    const updated = await this.prisma.course.update({
      where: { id },
      data: { coverImage: null },
    });
    const oldPath = this.extractFilePathFromUrl(existing.coverImage);
    if (oldPath) {
      await this.uploads.deleteFile(oldPath).catch(() => undefined);
    }
    return { course: updated };
  }

  /**
   * Pull the storage path out of a public URL so we can hand it back to
   * the storage layer for deletion. Returns null for external URLs (paste
   * from elsewhere) — those aren't ours to delete.
   */
  private extractFilePathFromUrl(url: string): string | null {
    // Local dev (/uploads/<path>) and R2 public URLs share a structure
    // where everything after `/academy/courses/` is the storage path key.
    const marker = 'academy/courses/';
    const idx = url.indexOf(marker);
    if (idx < 0) return null;
    return url.slice(idx);
  }

  /**
   * Preview the blast radius of a course delete so the admin can make
   * an informed decision before clicking confirm. Active = not revoked;
   * wildcard enrollments (courseId IS NULL) are unaffected by a single
   * course delete, so they don't count here.
   */
  async deleteImpact(id: string) {
    await this.ensureExists(id);
    const [lessonCount, activeEnrollmentCount] = await this.prisma.$transaction(
      [
        this.prisma.lesson.count({ where: { courseId: id } }),
        this.prisma.academyEnrollment.count({
          where: { courseId: id, revokedAt: null },
        }),
      ],
    );
    return { lessonCount, activeEnrollmentCount };
  }

  private async ensureExists(id: string) {
    await ensureFound(
      this.prisma.course.findUnique({ where: { id }, select: { id: true } }),
      'Course',
    );
  }

  private async slugOf(id: string): Promise<string> {
    const row = await this.prisma.course.findUnique({
      where: { id },
      select: { slug: true },
    });
    if (!row) throw new ConflictException('Course vanished mid-update');
    return row.slug;
  }

  private async nextCourseOrder(): Promise<number> {
    const max = await this.prisma.course.aggregate({
      _max: { order: true },
    });
    return (max._max.order ?? 0) + 10;
  }

  private async userCanRead(userId: string, courseId: string): Promise<boolean> {
    const match = await this.prisma.academyEnrollment.findFirst({
      where: {
        userId,
        revokedAt: null,
        OR: [{ courseId: null }, { courseId }],
      },
      select: { id: true },
    });
    return match !== null;
  }

  /**
   * Given a user and a set of course ids, return a map keyed by courseId
   * with the enrollment-derived UI flags. One round-trip to the DB:
   *   - wildcard row (courseId NULL, revokedAt NULL) covers all of them
   *   - per-course rows override only for their matching courseId
   *
   * `canUnenroll` requires a non-wildcard, self-service row for that
   * specific course — admin-granted rows and wildcards aren't removable
   * by the student.
   */
  private async computeEnrollmentState(
    userId: string,
    courseIds: string[],
  ): Promise<Map<string, { enrolled: boolean; canUnenroll: boolean }>> {
    const result = new Map<string, { enrolled: boolean; canUnenroll: boolean }>();
    if (courseIds.length === 0) return result;

    const rows = await this.prisma.academyEnrollment.findMany({
      where: {
        userId,
        revokedAt: null,
        OR: [{ courseId: null }, { courseId: { in: courseIds } }],
      },
      select: { courseId: true, grantedById: true },
    });
    const wildcardActive = rows.some((r) => r.courseId === null);
    const perCourse = new Map<string, { grantedById: string | null }>();
    for (const r of rows) {
      if (r.courseId !== null) {
        perCourse.set(r.courseId, { grantedById: r.grantedById });
      }
    }

    for (const id of courseIds) {
      const row = perCourse.get(id);
      const enrolled = wildcardActive || row !== undefined;
      const canUnenroll =
        !wildcardActive && row !== undefined && row.grantedById === null;
      result.set(id, { enrolled, canUnenroll });
    }
    return result;
  }
}
