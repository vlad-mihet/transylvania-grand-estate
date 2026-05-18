import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CourseStatus, CourseVisibility, LessonStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MetricsService } from '../../metrics/metrics.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import { LessonProgressService } from '../progress/lesson-progress.service';
import { ensureFound } from '../../common/utils/ensure-found.util';
import { toJson } from '../../common/utils/prisma-json';
import { applyDraftMode } from '../../common/utils/entry-draft';
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
    const { page = 1, limit = 20, status, type, sort, search } = query;
    const where: Prisma.LessonWhereInput = { courseId };
    if (status) where.status = status;
    if (type) where.type = type;
    if (search?.trim()) {
      const q = search.trim();
      // Match slug (TEXT column) + localized title across the 4 supported
      // locales. JSON path matching on each locale key lets the SQL planner
      // use the GIN index we maintain on the `title` JSONB column without
      // resorting to a full table scan via `path: ['*']`.
      where.OR = [
        { slug: { contains: q, mode: 'insensitive' } },
        { title: { path: ['ro'], string_contains: q } },
        { title: { path: ['en'], string_contains: q } },
        { title: { path: ['fr'], string_contains: q } },
        { title: { path: ['de'], string_contains: q } },
      ];
    }
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
   * Lightweight existence check used by routes that mint preview tokens
   * — they want to fail fast on a bogus lessonId without paying the
   * full `findByIdForAdmin` projection cost.
   */
  async assertExists(id: string): Promise<void> {
    const exists = await this.prisma.lesson.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Lesson not found');
  }

  /**
   * Preview read: returns the lesson by id with no enrollment /
   * visibility / status gating. Used by the dedicated preview endpoint
   * so admins (via a one-shot `previewToken=`) can render the
   * student-side view of any draft or unpublished lesson. Includes
   * prev/next pointers from the same course so the preview navigation
   * still works.
   */
  async findForPreview(lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      // Opt back into the `draft` JSON column so the preview shows the
      // pending unpublished snapshot (the whole point of preview).
      omit: { draft: false },
    });
    if (!lesson) return null;
    // Whole course's lessons in publication order so prev/next align
    // with the eventual student view; archived/draft lessons stay
    // visible here because a preview deliberately bypasses gates.
    const siblings = await this.prisma.lesson.findMany({
      where: { courseId: lesson.courseId },
      orderBy: { order: 'asc' },
      select: { id: true, slug: true, title: true },
    });
    const idx = siblings.findIndex((l) => l.id === lesson.id);
    const prev = idx > 0 ? siblings[idx - 1] : null;
    const next = idx < siblings.length - 1 ? siblings[idx + 1] : null;
    return { lesson, prev, next };
  }

  /**
   * Admin read with prev/next pointers for in-editor navigation. Mirrors the
   * student `findForStudent` sibling slice but ignores status — admin sees
   * draft and archived lessons too. Throws when the lesson exists but does
   * not belong to the supplied course (cross-course access via crafted URL).
   */
  async findByIdForAdminWithSiblings(courseId: string, id: string) {
    // Admin path used by the lesson edit page; opt back into the `draft`
    // column (PrismaService omits it by default) so the form can render
    // any pending unpublished snapshot.
    const lessons = await this.prisma.lesson.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
      omit: { draft: false },
    });
    const idx = lessons.findIndex((l) => l.id === id);
    if (idx < 0) throw new NotFoundException('Lesson not found');
    const lesson = lessons[idx];
    const prev = idx > 0 ? lessons[idx - 1] : null;
    const next = idx < lessons.length - 1 ? lessons[idx + 1] : null;
    return {
      ...lesson,
      position: idx + 1,
      total: lessons.length,
      prev: prev
        ? { id: prev.id, slug: prev.slug, title: prev.title }
        : null,
      next: next
        ? { id: next.id, slug: next.slug, title: next.title }
        : null,
    };
  }

  /**
   * Paginated lesson list for a student's TOC view. Used by the academy
   * `/courses/:slug` page to render a 20-per-page TOC with optional
   * client-driven search. Same access rules as `findForStudent`: public
   * courses bypass enrollment; `enrolled` courses require an active grant.
   *
   * Returns `{ data, meta }` plus `total` of *published* lessons in the
   * course (so the academy page can derive the total page count and
   * the resume-lesson page even when a search filter is active). Each
   * lesson row carries its 1-based `position` in the unfiltered ordered
   * list, plus a `completed` flag from the user's progress rows.
   */
  async findAllForStudent(args: {
    userId: string;
    courseSlug: string;
    page: number;
    limit: number;
    search?: string;
  }) {
    const { userId, courseSlug, page, limit, search } = args;
    const course = await this.prisma.course.findUnique({
      where: { slug: courseSlug },
      select: { id: true, status: true, visibility: true },
    });
    if (!course || course.status !== CourseStatus.published) return null;

    const canRead =
      course.visibility === CourseVisibility.public ||
      (await this.userCanRead(userId, course.id));
    if (!canRead) return null;

    // Pull every published lesson once. Position is stable to the
    // ordered list regardless of filter, so a search hit still says
    // "lesson 47 of 180". 180-lesson courses fit comfortably in memory
    // here (~10 KB) and avoid a second count() round-trip.
    const allLessons = await this.prisma.lesson.findMany({
      where: { courseId: course.id, status: LessonStatus.published },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        slug: true,
        order: true,
        title: true,
        excerpt: true,
        type: true,
        videoDurationSeconds: true,
        publishedAt: true,
        // content is needed for reading-time on text lessons. The cost
        // here is per-course (not per-page-render) and the typed select
        // keeps the wire payload small downstream.
        content: true,
      },
    });

    const filterMatch = (
      lesson: (typeof allLessons)[number],
      query: string,
    ): boolean => {
      const q = query.toLowerCase();
      if (lesson.slug.toLowerCase().includes(q)) return true;
      const title = lesson.title as Record<string, string | undefined>;
      for (const value of Object.values(title)) {
        if (value && value.toLowerCase().includes(q)) return true;
      }
      return false;
    };

    const filtered =
      search && search.trim()
        ? allLessons.filter((l) => filterMatch(l, search.trim()))
        : allLessons;

    const total = filtered.length;
    const skip = (page - 1) * limit;
    const slice = filtered.slice(skip, skip + limit);

    const userProgress = await this.progress.getProgressForCourse(
      userId,
      course.id,
    );

    // Index map: id → 1-based position in the unfiltered ordered list.
    // Computed once and reused per row so the position stays consistent
    // when the filter is active (lesson 47 stays "47" even on page 1
    // of search results).
    const positionById = new Map<string, number>();
    allLessons.forEach((l, idx) => positionById.set(l.id, idx + 1));

    return {
      data: slice.map((l) => ({
        id: l.id,
        slug: l.slug,
        order: l.order,
        position: positionById.get(l.id) ?? 0,
        title: l.title,
        excerpt: l.excerpt,
        type: l.type,
        videoDurationSeconds: l.videoDurationSeconds,
        publishedAt: l.publishedAt,
        content: l.content,
        completed: !!userProgress.get(l.id)?.completedAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        // Total published lessons in the course regardless of search.
        // Lets the UI render "showing 5 of 180 (3 matched)" correctly.
        coursePublishedTotal: allLessons.length,
      },
    };
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
    const { live, draft } = applyDraftMode(
      dto,
      ['title', 'excerpt', 'content'] as const,
      dto.mode,
    );
    if (live.title !== undefined) data.title = live.title;
    if (live.excerpt !== undefined) data.excerpt = live.excerpt;
    if (live.content !== undefined) data.content = live.content;
    if (draft !== undefined) data.draft = draft;

    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.order !== undefined) data.order = dto.order;
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
   * Move one lesson to a 1-based `targetOrder` inside its course. The
   * server fetches the lessons ASC, splices the moved row to
   * `targetOrder - 1`, and renumbers densely as `(idx + 1) * 10` in a
   * single transaction. The dense renumber preserves the sparse-int
   * pattern from the schema — manual `order` edits via the lesson form
   * can still squeeze a row between two existing positions after a move.
   *
   * `targetOrder` is clamped to `[1, lessonCount]` rather than rejected.
   * The cross-page "Move to position N" UI binds a number input; clamping
   * snaps obviously-out-of-range values (0, N+5) to a sensible endpoint
   * instead of surfacing a 400 the user can't act on.
   *
   * Same-position moves return `{ moved: 0 }` without touching the
   * database or incrementing the reorder metric — refetch-on-settle
   * still runs on the client, so this is also our defence against drag
   * events that don't actually change anything.
   */
  async move(courseId: string, lessonId: string, targetOrder: number) {
    await this.ensureCourseExists(courseId);
    const lessons = await this.prisma.lesson.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
      select: { id: true, order: true },
    });
    const fromIdx = lessons.findIndex((l) => l.id === lessonId);
    if (fromIdx < 0) {
      throw new BadRequestException(
        `lesson ${lessonId} does not belong to course ${courseId}`,
      );
    }
    const toIdx = Math.max(0, Math.min(lessons.length - 1, targetOrder - 1));
    if (fromIdx === toIdx) {
      return { ok: true, moved: 0 as const };
    }

    const next = [...lessons];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);

    await this.prisma.$transaction(
      next.map((l, idx) =>
        this.prisma.lesson.update({
          where: { id: l.id },
          data: { order: (idx + 1) * 10 },
        }),
      ),
    );
    this.metrics.academyReorders.inc();
    return {
      ok: true,
      moved: 1 as const,
      fromOrder: (fromIdx + 1) * 10,
      toOrder: (toIdx + 1) * 10,
    };
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
