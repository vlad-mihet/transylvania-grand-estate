import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { computeReadingTimeMinutes } from '@tge/types/utils/reading-time';
import { LessonsService } from './lessons.service';
import { AcademyAuthService } from '../auth/academy-auth.service';
import { LessonAttachmentsService } from '../attachments/lesson-attachments.service';
import { MetricsService } from '../../metrics/metrics.service';
import {
  CreateLessonDto,
  UpdateLessonDto,
  QueryLessonDto,
  StudentLessonsQueryDto,
} from './dto/lessons.dto';
import { MoveLessonDto } from './dto/move-lesson.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Realm } from '../../common/decorators/realm.decorator';
import { JwtAcademyAuthGuard } from '../auth/guards/jwt-academy-auth.guard';
import {
  CurrentAcademyUser,
  type AcademyUserPayload,
} from '../../common/decorators/academy-user.decorator';
import { normalizeLocale, pickLocalized } from '../utils/locale-fallback';

@ApiTags('Academy Lessons (Admin)')
@Controller('admin/academy/courses/:courseId/lessons')
export class AdminLessonsController {
  constructor(
    private readonly lessonsService: LessonsService,
    private readonly academyAuth: AcademyAuthService,
  ) {}

  @Roles(AdminRole.EDITOR, AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Get()
  async findAll(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Query() query: QueryLessonDto,
  ) {
    return this.lessonsService.findAllForAdmin(courseId, query);
  }

  // Declared before `:id` so Nest's first-match routing doesn't funnel this
  // into findOne with a bogus UUID and 400 on ParseUUIDPipe.
  @Roles(AdminRole.EDITOR, AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Get('next-order')
  async nextOrder(@Param('courseId', ParseUUIDPipe) courseId: string) {
    return { order: await this.lessonsService.nextOrderInCourse(courseId) };
  }

  @Roles(AdminRole.EDITOR, AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Get(':id')
  async findOne(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.lessonsService.findByIdForAdminWithSiblings(courseId, id);
  }

  /**
   * Move a single lesson to a 1-based `targetOrder` inside the course.
   * Server clamps the target to `[1, lessonCount]` and renumbers densely
   * in one transaction. Replaces the previous bulk-array reorder so the
   * admin can paginate the lesson list without losing drag-and-drop
   * (cross-page moves use the same endpoint via the "Move to position…"
   * row action).
   */
  @Roles(AdminRole.EDITOR, AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Post(':id/move')
  @HttpCode(200)
  async move(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoveLessonDto,
  ) {
    return this.lessonsService.move(courseId, id, dto.targetOrder);
  }

  @Roles(AdminRole.EDITOR, AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Post()
  async create(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: CreateLessonDto,
  ) {
    return this.lessonsService.create(courseId, dto);
  }

  @Roles(AdminRole.EDITOR, AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.lessonsService.update(id, dto);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.lessonsService.remove(id);
  }

  /**
   * Mint a one-shot preview link for this lesson. The admin opens the
   * URL in a new tab; the academy app reads `previewToken=` from the
   * query string and renders the lesson via the dedicated preview
   * endpoint. 5-min TTL.
   */
  @Roles(AdminRole.EDITOR, AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Post(':id/preview-token')
  @HttpCode(200)
  async previewToken(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() _body: unknown,
    @Req() req: { user: { id: string } },
  ) {
    // Verify the lesson exists so the editor doesn't get back a token
    // that 404s the moment they click it.
    await this.lessonsService.assertExists(id);
    return this.academyAuth.mintPreviewToken({
      lessonId: id,
      adminId: req.user.id,
    });
  }
}

@ApiTags('Academy Lessons (Student)')
@Controller('academy/courses/:courseSlug/lessons')
@Realm('academy')
@UseGuards(JwtAcademyAuthGuard)
export class StudentLessonsController {
  constructor(
    private readonly lessonsService: LessonsService,
    private readonly attachmentsService: LessonAttachmentsService,
    private readonly metrics: MetricsService,
  ) {}

  /**
   * Paginated lesson list for a student's TOC view. Default 20 per page —
   * tuned for the "smart paginated" UX where the academy page auto-jumps
   * to the page containing the resume lesson on first load.
   */
  @Get()
  async findAll(
    @CurrentAcademyUser() user: AcademyUserPayload,
    @Param('courseSlug') courseSlug: string,
    @Query() query: StudentLessonsQueryDto,
    @Query('locale') localeRaw?: string,
  ) {
    const { page = 1, limit = 20, search } = query;
    const result = await this.lessonsService.findAllForStudent({
      userId: user.id,
      courseSlug,
      page,
      limit,
      search,
    });
    if (!result) throw new NotFoundException('Course not found');
    const locale = normalizeLocale(localeRaw);
    return {
      data: result.data.map((l) => {
        const title = pickLocalized(
          l.title as Record<string, string | undefined>,
          locale,
        );
        const content = pickLocalized(
          l.content as Record<string, string | undefined>,
          locale,
        );
        return {
          id: l.id,
          slug: l.slug,
          order: l.order,
          position: l.position,
          title: l.title,
          excerpt: l.excerpt,
          type: l.type,
          readingTimeMinutes:
            l.type === 'text'
              ? computeReadingTimeMinutes(content.text)
              : null,
          videoDurationSeconds:
            l.type === 'video' ? l.videoDurationSeconds : null,
          publishedAt: l.publishedAt?.toISOString() ?? null,
          completed: l.completed,
          servedLocale: title.servedLocale,
          localizedTitle: title.text,
        };
      }),
      meta: result.meta,
    };
  }

  @Get(':lessonSlug')
  async findOne(
    @CurrentAcademyUser() user: AcademyUserPayload,
    @Param('courseSlug') courseSlug: string,
    @Param('lessonSlug') lessonSlug: string,
    @Query('locale') localeRaw?: string,
  ) {
    const result = await this.lessonsService.findForStudent({
      userId: user.id,
      courseSlug,
      lessonSlug,
    });
    if (!result) throw new NotFoundException('Lesson not found');
    const { lesson, prev, next, completedAt } = result;
    const locale = normalizeLocale(localeRaw);
    const title = pickLocalized(lesson.title, locale);
    const excerpt = pickLocalized(lesson.excerpt, locale);
    const content = pickLocalized(lesson.content, locale);
    // Composed in parallel with the lesson read so the response stays
    // single-round-trip for the student. Empty array is fine when the
    // lesson has no attachments — no special-casing on the client.
    const attachments = await this.attachmentsService.listForLesson(
      lesson.id,
    );
    // Label by the served locale, not the requested one — the fallback
    // chain picks `ro` when the requested locale's content is empty,
    // and dashboards should reflect what students actually read.
    this.metrics.academyLessonReads.inc({ locale: content.servedLocale });
    return {
      id: lesson.id,
      slug: lesson.slug,
      order: lesson.order,
      title: lesson.title,
      excerpt: lesson.excerpt,
      type: lesson.type,
      // Reading time is computed off the served-locale content so the UI
      // shows a realistic estimate for what the student is actually
      // reading (the fallback chain may hand back `ro` when the requested
      // locale is missing). Text-only; null for video.
      readingTimeMinutes:
        lesson.type === 'text' ? computeReadingTimeMinutes(content.text) : null,
      videoDurationSeconds:
        lesson.type === 'video' ? lesson.videoDurationSeconds : null,
      publishedAt: lesson.publishedAt?.toISOString() ?? null,
      videoUrl: lesson.videoUrl,
      content: content.text,
      servedLocale: content.servedLocale,
      localizedTitle: title.text,
      localizedExcerpt: excerpt.text,
      completed: completedAt !== null,
      completedAt: completedAt?.toISOString() ?? null,
      prev: prev
        ? {
            slug: prev.slug,
            localizedTitle: pickLocalized(prev.title, locale).text,
          }
        : null,
      next: next
        ? {
            slug: next.slug,
            localizedTitle: pickLocalized(next.title, locale).text,
          }
        : null,
      attachments,
    };
  }
}

/**
 * Preview-only read for an admin-minted preview token. The strategy
 * stamps `req.user.preview = { lessonId }` for these tokens; we
 * verify the path lessonId matches and return the lesson detail with
 * draft content overlaid on the live row. Visibility / enrollment
 * gates are deliberately bypassed — the whole point of preview is to
 * see the student-side render before publishing.
 */
@ApiTags('Academy Lesson Preview (Student)')
@Controller('academy/preview/lessons')
@Realm('academy')
@UseGuards(JwtAcademyAuthGuard)
export class LessonPreviewController {
  constructor(
    private readonly lessonsService: LessonsService,
    private readonly attachmentsService: LessonAttachmentsService,
  ) {}

  @Get(':lessonId')
  async findOne(
    @CurrentAcademyUser() user: AcademyUserPayload & {
      preview?: { lessonId: string };
    },
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Query('locale') localeRaw?: string,
  ) {
    if (!user.preview || user.preview.lessonId !== lessonId) {
      throw new NotFoundException('Preview token does not authorize this lesson');
    }
    const result = await this.lessonsService.findForPreview(lessonId);
    if (!result) throw new NotFoundException('Lesson not found');
    const { lesson, prev, next } = result;
    const locale = normalizeLocale(localeRaw);
    const attachments = await this.attachmentsService.listForLesson(
      lesson.id,
    );

    // Overlay the lesson's `draft` JSON column on the live fields so
    // unpublished edits are visible. The shape mirrors the student
    // findOne response so the academy preview page can reuse the same
    // renderer with no special-cased branches.
    const draft = (lesson.draft ?? null) as
      | Record<string, unknown>
      | null;
    const titleData = (draft?.title as Record<string, string | undefined>) ??
      (lesson.title as Record<string, string | undefined>);
    const excerptData =
      (draft?.excerpt as Record<string, string | undefined>) ??
      (lesson.excerpt as Record<string, string | undefined>);
    const contentData =
      (draft?.content as Record<string, string | undefined>) ??
      (lesson.content as Record<string, string | undefined>);

    const title = pickLocalized(titleData, locale);
    const excerpt = pickLocalized(excerptData, locale);
    const content = pickLocalized(contentData, locale);

    return {
      id: lesson.id,
      slug: lesson.slug,
      order: lesson.order,
      title: titleData,
      excerpt: excerptData,
      type: lesson.type,
      readingTimeMinutes:
        lesson.type === 'text'
          ? computeReadingTimeMinutes(content.text)
          : null,
      videoDurationSeconds:
        lesson.type === 'video' ? lesson.videoDurationSeconds : null,
      publishedAt: lesson.publishedAt?.toISOString() ?? null,
      videoUrl: lesson.videoUrl,
      content: content.text,
      servedLocale: content.servedLocale,
      localizedTitle: title.text,
      localizedExcerpt: excerpt.text,
      // Preview surfaces don't carry student progress.
      completed: false,
      completedAt: null,
      prev: prev
        ? {
            slug: prev.slug,
            localizedTitle: pickLocalized(
              prev.title as Record<string, string | undefined>,
              locale,
            ).text,
          }
        : null,
      next: next
        ? {
            slug: next.slug,
            localizedTitle: pickLocalized(
              next.title as Record<string, string | undefined>,
              locale,
            ).text,
          }
        : null,
      attachments,
      // Sentinel the student app reads to render the yellow banner.
      preview: true,
    };
  }
}
