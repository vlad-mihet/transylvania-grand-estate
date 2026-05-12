import { ConflictException, Injectable } from '@nestjs/common';
import { CourseStatus, CourseVisibility, LessonStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadsService } from '../../uploads/uploads.service';
import { LessonProgressService } from '../progress/lesson-progress.service';
import { computeResumeLessonSlug } from '../progress/resume-lesson.util';
import { ensureFound } from '../../common/utils/ensure-found.util';
import { buildCsvStream } from '../../common/utils/csv-stream';
import type { AcademyCourseStats } from '@tge/types/schemas/academy';
import { ensureSlugUnique } from '../../common/utils/ensure-slug-unique.util';
import { toJson } from '../../common/utils/prisma-json';
import { applyDraftMode } from '../../common/utils/entry-draft';
import { paginate } from '../../common/utils/pagination.util';
import { localizedJsonContainsAny } from '../../common/utils/localized-search';
import type { CreateCourseDto, UpdateCourseDto, QueryCourseDto } from './dto/courses.dto';

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
    private readonly progress: LessonProgressService,
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
        ...localizedJsonContainsAny('title', search).map((filter) => ({
          title: filter,
        })),
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
    // Admin path used by the edit page to pre-populate the form. Opt back
    // into the `draft` column (PrismaService omits it by default) so the
    // editor can render any pending unpublished snapshot + the
    // "Draft pending" chip.
    return ensureFound(
      this.prisma.course.findUnique({
        where: { id },
        include: { _count: { select: { lessons: true } } },
        omit: { draft: false },
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
      // Stable base order so courses the student has never opened keep
      // their admin-set sequence. Recently-touched courses re-sort to the
      // top below in-memory once progress stats are loaded.
      orderBy: [{ order: 'asc' }, { publishedAt: 'desc' }],
      include: { _count: { select: { lessons: { where: { status: 'published' } } } } },
    });
    const courseIds = courses.map((c) => c.id);
    const [state, lessons, progressPerCourse] = await Promise.all([
      this.computeEnrollmentState(userId, courseIds),
      this.fetchPublishedLessonMeta(courseIds),
      this.fetchUserProgressForCourses(userId, courseIds),
    ]);
    const totalsByCourse = new Map<string, number>();
    for (const [id, ls] of lessons) totalsByCourse.set(id, ls.length);
    const stats = await this.progress.getStatsForCourses(userId, totalsByCourse);
    const enriched = courses.map((c) => {
      const stat = stats.get(c.id) ?? {
        totalLessons: 0,
        completedLessons: 0,
        lastSeenAt: null,
      };
      return {
        ...c,
        enrolled: true,
        canUnenroll: state.get(c.id)?.canUnenroll ?? false,
        progress: {
          totalLessons: stat.totalLessons,
          completedLessons: stat.completedLessons,
          lastSeenAt: stat.lastSeenAt,
          resumeLessonSlug: computeResumeLessonSlug(
            lessons.get(c.id) ?? [],
            progressPerCourse.get(c.id) ?? new Map(),
          ),
        },
      };
    });
    // Dashboard ordering: most-recently-seen course floats up; never-opened
    // courses keep their admin `order`. Tie-break by creation order when
    // both sides have (or lack) a lastSeenAt.
    enriched.sort((a, b) => {
      const aSeen = a.progress.lastSeenAt?.getTime() ?? -1;
      const bSeen = b.progress.lastSeenAt?.getTime() ?? -1;
      if (aSeen !== bSeen) return bSeen - aSeen;
      return a.order - b.order;
    });
    return enriched;
  }

  /**
   * Public catalog: published courses flagged `visibility: public`. Any
   * authenticated academy user can list them; no enrollment required. Used
   * by the academy `/catalog` page so new signups (and admin-invited users
   * with narrow grants) can discover freely readable content.
   *
   * Paginated `{ data, meta }` envelope so the catalog can render with a
   * page-numbered nav. Optional `search` matches localized title (ro/en)
   * and slug; case-insensitive on slug, JSON path-contains on title.
   */
  async findAllPublic(args: {
    userId: string;
    page: number;
    limit: number;
    search?: string;
  }) {
    const { userId, page, limit, search } = args;
    const where: Prisma.CourseWhereInput = {
      status: CourseStatus.published,
      visibility: CourseVisibility.public,
    };
    if (search) {
      where.OR = [
        ...localizedJsonContainsAny('title', search).map((filter) => ({
          title: filter,
        })),
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }
    const orderBy: Prisma.CourseOrderByWithRelationInput[] = [
      { order: 'asc' },
      { publishedAt: 'desc' },
    ];

    // Run paginate() to get the page slice + total. Enrollment / progress
    // enrichment then happens for just the visible slice — never for the
    // full course set.
    const paginated = await paginate(
      (skip, take) =>
        this.prisma.course.findMany({
          where,
          orderBy,
          skip,
          take,
          include: {
            _count: { select: { lessons: { where: { status: 'published' } } } },
          },
        }),
      () => this.prisma.course.count({ where }),
      page,
      limit,
    );

    const courseIds = paginated.data.map((c) => c.id);
    const [state, lessons, progressPerCourse] = await Promise.all([
      this.computeEnrollmentState(userId, courseIds),
      this.fetchPublishedLessonMeta(courseIds),
      this.fetchUserProgressForCourses(userId, courseIds),
    ]);
    const totalsByCourse = new Map<string, number>();
    for (const [id, ls] of lessons) totalsByCourse.set(id, ls.length);
    const stats = await this.progress.getStatsForCourses(userId, totalsByCourse);
    const enriched = paginated.data.map((c) => {
      const s = state.get(c.id);
      const stat = stats.get(c.id) ?? {
        totalLessons: 0,
        completedLessons: 0,
        lastSeenAt: null,
      };
      return {
        ...c,
        enrolled: s?.enrolled ?? false,
        canUnenroll: s?.canUnenroll ?? false,
        progress: {
          totalLessons: stat.totalLessons,
          completedLessons: stat.completedLessons,
          lastSeenAt: stat.lastSeenAt,
          resumeLessonSlug: computeResumeLessonSlug(
            lessons.get(c.id) ?? [],
            progressPerCourse.get(c.id) ?? new Map(),
          ),
        },
      };
    });
    return { data: enriched, meta: paginated.meta };
  }

  async findBySlugForStudent(userId: string, slug: string) {
    const course = await this.prisma.course.findUnique({
      where: { slug },
      // Lessons used to be embedded inline; the academy page now uses the
      // dedicated paginated `/academy/courses/:slug/lessons` endpoint to
      // render the TOC. We still need the published lesson list here to
      // compute `progress.resumeLessonPosition` + `firstLessonSlug`, but
      // only id+slug — content/title/etc. stay out of this response.
      include: {
        lessons: {
          where: { status: 'published' },
          orderBy: { order: 'asc' },
          select: { id: true, slug: true },
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
    const publishedLessonMeta = course.lessons.map((l) => ({
      id: l.id,
      slug: l.slug,
    }));
    const totalsByCourse = new Map<string, number>([
      [course.id, publishedLessonMeta.length],
    ]);
    const [state, stats, userProgress] = await Promise.all([
      this.computeEnrollmentState(userId, [course.id]),
      this.progress.getStatsForCourses(userId, totalsByCourse),
      this.progress.getProgressForCourse(userId, course.id),
    ]);
    const s = state.get(course.id);
    const stat = stats.get(course.id) ?? {
      totalLessons: publishedLessonMeta.length,
      completedLessons: 0,
      lastSeenAt: null,
    };
    const resumeLessonSlug = computeResumeLessonSlug(
      publishedLessonMeta,
      userProgress,
    );
    // 1-based position of the resume lesson in the published-ordered list.
    // Lets the academy page auto-jump to the page containing the student's
    // current lesson without rendering the full TOC client-side.
    const resumeLessonPosition = resumeLessonSlug
      ? publishedLessonMeta.findIndex((l) => l.slug === resumeLessonSlug) + 1 ||
        null
      : null;
    return {
      ...course,
      enrolled: s?.enrolled ?? false,
      canUnenroll: s?.canUnenroll ?? false,
      firstLessonSlug: publishedLessonMeta[0]?.slug ?? null,
      progress: {
        totalLessons: stat.totalLessons,
        completedLessons: stat.completedLessons,
        lastSeenAt: stat.lastSeenAt,
        resumeLessonSlug,
        resumeLessonPosition,
      },
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
    // ensureExists narrows the select to `{ id }` — fetch the old cover URL
    // separately when the PATCH actually touches it so we know what to clean
    // up. Skipped otherwise to avoid a wasted query.
    const existing =
      dto.coverImage !== undefined
        ? await this.prisma.course.findUnique({
            where: { id },
            select: { coverImage: true },
          })
        : null;
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
    const { live, draft } = applyDraftMode(
      dto,
      ['title', 'description'] as const,
      dto.mode,
    );
    if (live.title !== undefined) data.title = live.title;
    if (live.description !== undefined) data.description = live.description;
    if (draft !== undefined) data.draft = draft;
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
    const updated = await this.prisma.course.update({ where: { id }, data });
    // PATCH path bypasses setCoverImage/clearCoverImage; mirror their cleanup
    // here so a direct dto.coverImage swap doesn't orphan the prior asset.
    if (
      dto.coverImage !== undefined &&
      existing?.coverImage &&
      existing.coverImage !== dto.coverImage
    ) {
      await this.uploads.deleteByPublicUrl(
        existing.coverImage,
        `academy/courses/${id}`,
      );
    }
    return updated;
  }

  async remove(id: string) {
    await this.ensureExists(id);
    // Cascade takes out lessons + enrollments targeting this course.
    return this.prisma.course.delete({ where: { id } });
  }

  /**
   * Clone a course into a fresh draft. The new row carries:
   *  - status = draft (regardless of the source's status)
   *  - publishedAt = null
   *  - localized title/description copied verbatim from the source
   *  - the source's `draft` JSON column copied so unsaved edits the
   *    editor was working on continue on the clone
   *  - coverImage URL referenced (not duplicated in storage); first
   *    image edit on the clone will upload to its own per-course-id
   *    storage prefix
   *  - order placed after the highest existing course (next sparse slot)
   *
   * When `copyLessons: true`, every lesson on the source is cloned with
   * a new id and status = draft, preserving the original `order` so the
   * sequence reads identically to the source (still sparse-int).
   *
   * The whole thing is one transaction so a half-cloned course never
   * leaks into the catalog.
   */
  async duplicate(
    sourceId: string,
    args: { slug: string; copyLessons?: boolean },
  ) {
    await this.ensureExists(sourceId);
    await ensureSlugUnique(args.slug, 'Course', (slug) =>
      this.prisma.course.findUnique({
        where: { slug },
        select: { id: true },
      }),
    );

    const source = await ensureFound(
      this.prisma.course.findUnique({
        where: { id: sourceId },
        omit: { draft: false },
      }),
      'Course',
    );
    const lessonsToClone = args.copyLessons
      ? await this.prisma.lesson.findMany({
          where: { courseId: sourceId },
          orderBy: { order: 'asc' },
          select: {
            slug: true,
            order: true,
            title: true,
            excerpt: true,
            content: true,
            type: true,
            videoUrl: true,
            videoDurationSeconds: true,
          },
        })
      : [];
    const nextOrder = await this.nextCourseOrder();

    return this.prisma.$transaction(async (tx) => {
      const created = await tx.course.create({
        data: {
          slug: args.slug,
          title: source.title as Prisma.InputJsonValue,
          description: source.description as Prisma.InputJsonValue,
          coverImage: source.coverImage,
          visibility: source.visibility,
          // Always start as a draft — the editor decides when the
          // clone is ready to publish. Don't copy publishedAt.
          status: CourseStatus.draft,
          publishedAt: null,
          order: nextOrder,
          // Carry over any pending unsaved edits the editor was
          // working on. Null/undefined-safe; the column is nullable.
          draft:
            source.draft === null
              ? Prisma.JsonNull
              : (source.draft as Prisma.InputJsonValue),
        },
      });

      if (lessonsToClone.length) {
        // createMany would be cheaper, but Prisma's batch syntax
        // doesn't accept JSON columns inside SQLite; we're on
        // Postgres so it works. Keep the loop for clarity though —
        // courses rarely exceed ~50 lessons and the transaction is
        // already open, so the extra round-trips don't matter.
        for (const l of lessonsToClone) {
          await tx.lesson.create({
            data: {
              courseId: created.id,
              slug: l.slug,
              order: l.order,
              title: l.title as Prisma.InputJsonValue,
              excerpt: l.excerpt as Prisma.InputJsonValue,
              content: l.content as Prisma.InputJsonValue,
              type: l.type,
              videoUrl: l.videoUrl,
              videoDurationSeconds: l.videoDurationSeconds,
              // Match course: the clone's lessons start as drafts so
              // a half-translated course doesn't surface accidentally.
              status: 'draft',
              publishedAt: null,
            },
          });
        }
      }

      return created;
    });
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
    const directory = `academy/courses/${id}`;
    const result = await this.uploads.uploadFile(file, directory);
    const updated = await this.prisma.course.update({
      where: { id },
      data: { coverImage: result.publicUrl },
    });
    if (previous?.coverImage && previous.coverImage !== result.publicUrl) {
      await this.uploads.deleteByPublicUrl(previous.coverImage, directory);
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
    await this.uploads.deleteByPublicUrl(
      existing.coverImage,
      `academy/courses/${id}`,
    );
    return { course: updated };
  }

  /**
   * Course-level completion stats for the admin course detail page.
   * Reads only — no writes. Counts:
   *  - `enrolledCount`: distinct users reachable by either an active
   *    wildcard or an active per-course enrollment for this course
   *    (deduplicated, so a user with both still counts once).
   *  - `startedCount`: distinct users with at least one LessonProgress
   *    row in this course.
   *  - `completedCount`: users whose `completedAt`-stamped LessonProgress
   *    rows in this course equal the count of currently-published lessons.
   *  - `lessonCompletionDistribution`: per-lesson completed counts in
   *    course order, useful for spotting drop-off cliffs.
   *
   * Wildcard semantics match read access: a wildcard grants access to
   * every published course, so wildcard holders count toward `enrolled`
   * here. Archived/draft lessons are excluded from `total` and `completed`
   * so the rate doesn't drop the moment a lesson is archived.
   */
  async computeStats(id: string): Promise<AcademyCourseStats> {
    await this.ensureExists(id);

    const publishedLessons = await this.prisma.lesson.findMany({
      where: { courseId: id, status: LessonStatus.published },
      orderBy: { order: 'asc' },
      select: { id: true, slug: true },
    });
    const totalPublishedLessons = publishedLessons.length;
    const publishedLessonIds = publishedLessons.map((l) => l.id);

    // Read-only rollup; Promise.all suffices (no transactional invariant
    // across these queries since the page is a snapshot anyway).
    const [enrolledCountRows, startedCountRows, distribution] =
      await Promise.all([
        // Distinct users reachable by either an active wildcard or an
        // active per-course enrollment for this course. groupBy gives us
        // the dedup we need (a user with both rows yields one userId).
        this.prisma.academyEnrollment.groupBy({
          by: ['userId'],
          where: {
            revokedAt: null,
            OR: [{ courseId: null }, { courseId: id }],
          },
        }),
        // Distinct users who've opened at least one published lesson.
        publishedLessonIds.length === 0
          ? Promise.resolve([] as Array<{ userId: string }>)
          : this.prisma.lessonProgress.groupBy({
              by: ['userId'],
              where: { lessonId: { in: publishedLessonIds } },
            }),
        // Per-lesson completed count. Empty when no published lessons.
        publishedLessonIds.length === 0
          ? Promise.resolve(
              [] as Array<{
                lessonId: string;
                _count: { lessonId: number };
              }>,
            )
          : this.prisma.lessonProgress.groupBy({
              by: ['lessonId'],
              where: {
                lessonId: { in: publishedLessonIds },
                completedAt: { not: null },
              },
              _count: { lessonId: true },
            }),
      ]);

    const enrolledCount = enrolledCountRows.length;
    const startedCount = startedCountRows.length;

    // Users who've completed ALL currently-published lessons. groupBy
    // with `having` would be ideal but Prisma's groupBy + having doesn't
    // support an equality on an aggregate count for `lessonId` cleanly.
    // Instead: pull users whose completed-lesson rows in this course
    // number `totalPublishedLessons` exactly.
    let completedUserIds: string[] = [];
    if (totalPublishedLessons > 0) {
      const completedAggregates = await this.prisma.lessonProgress.groupBy({
        by: ['userId'],
        where: {
          lessonId: { in: publishedLessonIds },
          completedAt: { not: null },
        },
        _count: { lessonId: true },
      });
      completedUserIds = completedAggregates
        .filter((row) => row._count.lessonId === totalPublishedLessons)
        .map((row) => row.userId);
    }
    const completedCount = completedUserIds.length;

    const completionRate =
      enrolledCount === 0
        ? 0
        : Math.round((completedCount / enrolledCount) * 100);

    // Average days from earliest startedAt to latest completedAt for users
    // who completed everything. Null when no one has finished yet.
    let avgDaysToFirstCompletion: number | null = null;
    if (completedCount > 0) {
      const rows = await this.prisma.lessonProgress.findMany({
        where: {
          userId: { in: completedUserIds },
          lessonId: { in: publishedLessonIds },
        },
        select: { userId: true, startedAt: true, completedAt: true },
      });
      const perUser = new Map<
        string,
        { earliestStart: Date; latestComplete: Date | null }
      >();
      for (const r of rows) {
        const entry = perUser.get(r.userId);
        if (!entry) {
          perUser.set(r.userId, {
            earliestStart: r.startedAt,
            latestComplete: r.completedAt,
          });
          continue;
        }
        if (r.startedAt < entry.earliestStart) entry.earliestStart = r.startedAt;
        if (
          r.completedAt &&
          (!entry.latestComplete || r.completedAt > entry.latestComplete)
        ) {
          entry.latestComplete = r.completedAt;
        }
      }
      const dayMs = 1000 * 60 * 60 * 24;
      let sumDays = 0;
      let count = 0;
      for (const { earliestStart, latestComplete } of perUser.values()) {
        if (!latestComplete) continue;
        const diffDays =
          (latestComplete.getTime() - earliestStart.getTime()) / dayMs;
        if (diffDays >= 0) {
          sumDays += diffDays;
          count += 1;
        }
      }
      if (count > 0) {
        avgDaysToFirstCompletion = Math.round((sumDays / count) * 10) / 10;
      }
    }

    const distributionByLessonId = new Map<string, number>();
    for (const row of distribution) {
      distributionByLessonId.set(row.lessonId, row._count.lessonId);
    }
    const lessonCompletionDistribution = publishedLessons.map((l) => ({
      lessonId: l.id,
      slug: l.slug,
      completedCount: distributionByLessonId.get(l.id) ?? 0,
    }));

    return {
      enrolledCount,
      startedCount,
      completedCount,
      completionRate,
      avgDaysToFirstCompletion,
      totalPublishedLessons,
      lessonCompletionDistribution,
    };
  }

  /**
   * Streamed CSV of every active per-course enrollment for this course.
   * Wildcard enrollments are NOT included — by design, the export is a
   * roster you can hand off as "students who explicitly have access to
   * THIS course". Wildcard holders are visible separately on the
   * student-detail page.
   */
  async enrollmentsCsv(id: string) {
    await this.ensureExists(id);
    const slug = (
      await this.prisma.course.findUnique({
        where: { id },
        select: { slug: true },
      })
    )?.slug;

    const prisma = this.prisma;
    async function* rows() {
      const pageSize = 500;
      let cursor: string | undefined;
      // Cache for AdminUser email lookups — granted-by ids repeat across
      // rows in any reasonably-sized course roster, so caching the email
      // pulls down round-trips dramatically.
      const granterEmailCache = new Map<string, string | null>();

      while (true) {
        const batch = await prisma.academyEnrollment.findMany({
          where: { courseId: id, revokedAt: null },
          orderBy: { enrolledAt: 'asc' },
          take: pageSize,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
        });
        if (batch.length === 0) break;

        // Resolve any new granter ids in a single round-trip per page.
        const unknownGranterIds = Array.from(
          new Set(
            batch
              .map((r) => r.grantedById)
              .filter((g): g is string => !!g && !granterEmailCache.has(g)),
          ),
        );
        if (unknownGranterIds.length) {
          const granters = await prisma.adminUser.findMany({
            where: { id: { in: unknownGranterIds } },
            select: { id: true, email: true },
          });
          for (const g of granters) granterEmailCache.set(g.id, g.email);
          // Stash misses so we don't re-query them.
          for (const id of unknownGranterIds) {
            if (!granterEmailCache.has(id)) granterEmailCache.set(id, null);
          }
        }

        for (const r of batch) {
          yield [
            r.user.id,
            r.user.email,
            r.user.name,
            r.enrolledAt,
            r.grantedById ?? '',
            r.grantedById
              ? (granterEmailCache.get(r.grantedById) ?? '')
              : '',
          ];
        }
        if (batch.length < pageSize) break;
        cursor = batch[batch.length - 1]!.id;
      }
    }
    const filename = `academy-${slug ?? 'course'}-enrollments-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    return buildCsvStream(
      ['studentId', 'email', 'name', 'enrolledAt', 'grantedById', 'grantedByEmail'],
      rows(),
      filename,
    );
  }

  /**
   * Streamed CSV of per-student progress against this course. Includes
   * wildcard holders (they can read the course, so their progress
   * counts). Stats are point-in-time — repeated downloads will see
   * deltas as students complete more lessons.
   */
  async progressCsv(id: string) {
    await this.ensureExists(id);
    const course = await this.prisma.course.findUnique({
      where: { id },
      select: { slug: true },
    });

    const publishedLessons = await this.prisma.lesson.findMany({
      where: { courseId: id, status: LessonStatus.published },
      orderBy: { order: 'asc' },
      select: { id: true, slug: true },
    });
    const totalLessons = publishedLessons.length;

    // All users with active access (wildcard or per-course).
    const enrollments = await this.prisma.academyEnrollment.findMany({
      where: {
        revokedAt: null,
        OR: [{ courseId: null }, { courseId: id }],
      },
      select: {
        userId: true,
        user: { select: { id: true, email: true, name: true } },
      },
    });
    const userMap = new Map<
      string,
      { id: string; email: string; name: string }
    >();
    for (const e of enrollments) {
      userMap.set(e.userId, {
        id: e.user.id,
        email: e.user.email,
        name: e.user.name,
      });
    }
    const userIds = Array.from(userMap.keys());

    // Per-user progress: completedLessons + lastSeenAt; pre-bucketed.
    const progressRows = userIds.length
      ? await this.prisma.lessonProgress.findMany({
          where: {
            userId: { in: userIds },
            lesson: { courseId: id, status: LessonStatus.published },
          },
          select: {
            userId: true,
            lessonId: true,
            completedAt: true,
            lastSeenAt: true,
          },
        })
      : [];
    type UserStat = {
      completed: number;
      lastSeenAt: Date | null;
      progressByLessonId: Map<string, { completedAt: Date | null; lastSeenAt: Date }>;
    };
    const stats = new Map<string, UserStat>();
    for (const id of userIds)
      stats.set(id, { completed: 0, lastSeenAt: null, progressByLessonId: new Map() });
    for (const r of progressRows) {
      const s = stats.get(r.userId)!;
      if (r.completedAt) s.completed += 1;
      if (!s.lastSeenAt || r.lastSeenAt > s.lastSeenAt) s.lastSeenAt = r.lastSeenAt;
      s.progressByLessonId.set(r.lessonId, {
        completedAt: r.completedAt,
        lastSeenAt: r.lastSeenAt,
      });
    }

    const lessonsForResume = publishedLessons.map((l) => ({
      id: l.id,
      slug: l.slug,
    }));

    const slug = course?.slug ?? 'course';
    const filename = `academy-${slug}-progress-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    const rows = userIds.map((uid) => {
      const u = userMap.get(uid)!;
      const s = stats.get(uid)!;
      const completionRate =
        totalLessons === 0
          ? 0
          : Math.round((s.completed / totalLessons) * 100);
      const resumeSlug = computeResumeLessonSlug(
        lessonsForResume,
        s.progressByLessonId,
      );
      return [
        u.id,
        u.email,
        s.completed,
        totalLessons,
        completionRate,
        s.lastSeenAt,
        resumeSlug ?? '',
      ];
    });

    return buildCsvStream(
      [
        'studentId',
        'email',
        'completedLessons',
        'totalLessons',
        'completionRate',
        'lastSeenAt',
        'resumeLessonSlug',
      ],
      rows,
      filename,
    );
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

  /**
   * One query for all published lesson ids + slugs on the requested
   * courses, grouped by `courseId` and kept in sparse-order so the
   * resume-lesson selector can walk them in order.
   */
  private async fetchPublishedLessonMeta(
    courseIds: string[],
  ): Promise<Map<string, Array<{ id: string; slug: string }>>> {
    const map = new Map<string, Array<{ id: string; slug: string }>>();
    if (courseIds.length === 0) return map;
    const rows = await this.prisma.lesson.findMany({
      where: { courseId: { in: courseIds }, status: 'published' },
      orderBy: { order: 'asc' },
      select: { id: true, slug: true, courseId: true },
    });
    for (const id of courseIds) map.set(id, []);
    for (const r of rows) map.get(r.courseId)?.push({ id: r.id, slug: r.slug });
    return map;
  }

  /**
   * The user's `LessonProgress` rows across multiple courses, bucketed
   * by `courseId` for O(1) lookup in the mapper.
   */
  private async fetchUserProgressForCourses(
    userId: string,
    courseIds: string[],
  ): Promise<
    Map<
      string,
      Map<string, { completedAt: Date | null; lastSeenAt: Date }>
    >
  > {
    const buckets = new Map<
      string,
      Map<string, { completedAt: Date | null; lastSeenAt: Date }>
    >();
    if (courseIds.length === 0) return buckets;
    for (const id of courseIds) buckets.set(id, new Map());
    const rows = await this.prisma.lessonProgress.findMany({
      where: {
        userId,
        lesson: { courseId: { in: courseIds }, status: 'published' },
      },
      select: {
        lessonId: true,
        completedAt: true,
        lastSeenAt: true,
        lesson: { select: { courseId: true } },
      },
    });
    for (const r of rows) {
      buckets.get(r.lesson.courseId)?.set(r.lessonId, {
        completedAt: r.completedAt,
        lastSeenAt: r.lastSeenAt,
      });
    }
    return buckets;
  }

}
