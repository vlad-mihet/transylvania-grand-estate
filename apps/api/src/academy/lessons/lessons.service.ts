import { BadRequestException, Injectable } from '@nestjs/common';
import { LessonStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MetricsService } from '../../metrics/metrics.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { LessonProgressService } from '../progress/lesson-progress.service';
import { ensureFound } from '../../common/utils/ensure-found.util';
import { toJson } from '../../common/utils/prisma-json';
import { paginate } from '../../common/utils/pagination.util';
import type {
  CreateLessonDto,
  UpdateLessonDto,
  QueryLessonDto,
} from './dto/lessons.dto';

@Injectable()
export class LessonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metrics: MetricsService,
    private readonly enrollments: EnrollmentsService,
    private readonly progress: LessonProgressService,
  ) {}

  async findAllForAdmin(courseId: string, query: QueryLessonDto) {
    const { page = 1, limit = 20, status, type, sort } = query;
    const where: Prisma.LessonWhereInput = { courseId };
    if (status) where.status = status;
    if (type) where.type = type;
    const orderBy: Prisma.LessonOrderByWithRelationInput =
      sort === 'newest'
        ? { createdAt: 'desc' }
        : sort === 'oldest'
          ? { createdAt: 'asc' }
          : { order: 'asc' };
    return paginate(
      (skip, take) =>
        this.prisma.lesson.findMany({ where, orderBy, skip, take }),
      () => this.prisma.lesson.count({ where }),
      page,
      limit,
    );
  }

  async findByIdForAdmin(id: string) {
    return ensureFound(
      this.prisma.lesson.findUnique({ where: { id } }),
      'Lesson',
    );
  }

  /**
   * Student read: resolves a lesson by course slug + lesson slug, enforces
   * enrollment, stamps progress, and returns the lesson + neighbouring
   * navigation pointers. Assumes the caller is authenticated at the
   * controller layer.
   */
  async findForStudent(args: {
    userId: string;
    courseSlug: string;
    lessonSlug: string;
  }) {
    const course = await this.prisma.course.findUnique({
      where: { slug: args.courseSlug },
      select: { id: true, status: true, visibility: true },
    });
    if (!course || course.status !== 'published') return null;

    // Public-visibility courses are readable by any authenticated academy
    // user — no enrollment lookup. `enrolled` courses still require an
    // active wildcard or per-course enrollment row.
    const canRead =
      course.visibility === 'public' ||
      (await this.userCanRead(args.userId, course.id));
    if (!canRead) return null;

    // Pull every published lesson in the course in one go — used for
    // the target lesson lookup + prev/next computation. One query
    // instead of two.
    const lessons = await this.prisma.lesson.findMany({
      where: { courseId: course.id, status: LessonStatus.published },
      orderBy: { order: 'asc' },
    });
    const idx = lessons.findIndex((l) => l.slug === args.lessonSlug);
    if (idx < 0) return null;
    const lesson = lessons[idx];
    const prev = idx > 0 ? lessons[idx - 1] : null;
    const next = idx < lessons.length - 1 ? lessons[idx + 1] : null;

    // Side-effect: reading a lesson on a public-visibility course implicitly
    // enrolls the student so the course lands on their dashboard. No-op if a
    // wildcard or per-course row already covers them; swallows errors so
    // the read never fails on an enrollment write race.
    if (course.visibility === 'public') {
      await this.enrollments.autoEnrollIfPublic(args.userId, course.id);
    }

    // Stamp progress (upsert with lastSeenAt = now). Swallowed errors —
    // see LessonProgressService.markSeen.
    await this.progress.markSeen(args.userId, lesson.id);

    const progressRow = await this.prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: args.userId, lessonId: lesson.id } },
      select: { completedAt: true },
    });

    return {
      lesson,
      prev,
      next,
      completedAt: progressRow?.completedAt ?? null,
    };
  }

  async create(courseId: string, dto: CreateLessonDto) {
    await this.ensureCourseExists(courseId);
    await this.ensureSlugUniqueInCourse(courseId, dto.slug);
    const type = dto.type ?? 'text';
    this.validateTypeAndVideoUrl(type, dto.videoUrl ?? null);
    this.validateTypeAndVideoDuration(type, dto.videoDurationSeconds ?? null);

    return this.prisma.lesson.create({
      data: {
        courseId,
        slug: dto.slug,
        order: dto.order,
        title: toJson(dto.title),
        excerpt: toJson(dto.excerpt),
        content: toJson(dto.content),
        type,
        videoUrl: dto.videoUrl ?? null,
        videoDurationSeconds: dto.videoDurationSeconds ?? null,
      },
    });
  }

  async update(id: string, dto: UpdateLessonDto) {
    const existing = await this.findByIdForAdmin(id);
    if (dto.slug !== undefined && dto.slug !== existing.slug) {
      await this.ensureSlugUniqueInCourse(existing.courseId, dto.slug);
    }
    if (
      dto.type !== undefined ||
      dto.videoUrl !== undefined ||
      dto.videoDurationSeconds !== undefined
    ) {
      const nextType = dto.type ?? existing.type;
      const nextUrl =
        dto.videoUrl !== undefined ? dto.videoUrl : existing.videoUrl;
      const nextDuration =
        dto.videoDurationSeconds !== undefined
          ? dto.videoDurationSeconds
          : existing.videoDurationSeconds;
      this.validateTypeAndVideoUrl(nextType, nextUrl);
      this.validateTypeAndVideoDuration(nextType, nextDuration);
    }

    const data: Prisma.LessonUpdateInput = {};
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.order !== undefined) data.order = dto.order;
    if (dto.title !== undefined) data.title = toJson(dto.title);
    if (dto.excerpt !== undefined) data.excerpt = toJson(dto.excerpt);
    if (dto.content !== undefined) data.content = toJson(dto.content);
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.videoUrl !== undefined) data.videoUrl = dto.videoUrl;
    if (dto.videoDurationSeconds !== undefined)
      data.videoDurationSeconds = dto.videoDurationSeconds;
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (
        dto.status === LessonStatus.published &&
        dto.publishedAt === undefined &&
        !existing.publishedAt
      ) {
        data.publishedAt = new Date();
      }
    }
    if (dto.publishedAt !== undefined) {
      data.publishedAt = dto.publishedAt ? new Date(dto.publishedAt) : null;
    }

    return this.prisma.lesson.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findByIdForAdmin(id);
    return this.prisma.lesson.delete({ where: { id } });
  }

  async nextOrderInCourse(courseId: string): Promise<number> {
    const max = await this.prisma.lesson.aggregate({
      where: { courseId },
      _max: { order: true },
    });
    return (max._max.order ?? 0) + 10;
  }

  /**
   * Atomically rewrite `order` for every lesson in the course. The caller
   * passes the full ordered sequence of lesson ids; we rewrite to sparse
   * (10, 20, 30, …) so manual inserts via the edit form's `order` field
   * can still squeeze rows between existing positions after a reorder.
   *
   * Validation rejects partial inputs so the endpoint stays safe:
   *   - Count mismatch → client is out of sync with the server; 400.
   *   - Duplicate id → impossible-by-design; 400.
   *   - Foreign id (not in this course) → 400.
   */
  async reorder(courseId: string, lessonIds: string[]) {
    await this.ensureCourseExists(courseId);
    const existing = await this.prisma.lesson.findMany({
      where: { courseId },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((l) => l.id));

    if (new Set(lessonIds).size !== lessonIds.length) {
      throw new BadRequestException('lessonIds must be unique');
    }
    if (lessonIds.length !== existingIds.size) {
      throw new BadRequestException(
        `lessonIds must cover all ${existingIds.size} lesson(s) in this course; got ${lessonIds.length}`,
      );
    }
    for (const id of lessonIds) {
      if (!existingIds.has(id)) {
        throw new BadRequestException(
          `lesson ${id} does not belong to course ${courseId}`,
        );
      }
    }

    await this.prisma.$transaction(
      lessonIds.map((id, idx) =>
        this.prisma.lesson.update({
          where: { id },
          data: { order: (idx + 1) * 10 },
        }),
      ),
    );
    this.metrics.academyReorders.inc();
    return { ok: true, reordered: lessonIds.length };
  }

  private async ensureCourseExists(courseId: string) {
    await ensureFound(
      this.prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true },
      }),
      'Course',
    );
  }

  private async ensureSlugUniqueInCourse(courseId: string, slug: string) {
    const existing = await this.prisma.lesson.findUnique({
      where: { courseId_slug: { courseId, slug } },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException(
        `Lesson with slug "${slug}" already exists in this course`,
      );
    }
  }

  private validateTypeAndVideoUrl(type: string, videoUrl: string | null) {
    if (type === 'video' && !videoUrl) {
      throw new BadRequestException('Video lessons require a videoUrl');
    }
    if (type === 'text' && videoUrl) {
      throw new BadRequestException('Text lessons cannot carry a videoUrl');
    }
  }

  private validateTypeAndVideoDuration(
    type: string,
    videoDurationSeconds: number | null,
  ) {
    if (type === 'text' && videoDurationSeconds !== null) {
      throw new BadRequestException(
        'Text lessons cannot carry a videoDurationSeconds; reading time is computed from content',
      );
    }
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
}
