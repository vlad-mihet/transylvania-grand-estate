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
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { computeReadingTimeMinutes } from '@tge/types/utils/reading-time';
import { LessonsService } from './lessons.service';
import { MetricsService } from '../../metrics/metrics.service';
import {
  CreateLessonDto,
  UpdateLessonDto,
  QueryLessonDto,
} from './dto/lessons.dto';
import { ReorderLessonsDto } from './dto/reorder-lessons.dto';
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
  constructor(private readonly lessonsService: LessonsService) {}

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

  /**
   * Atomic bulk reorder. Client submits the full ordered sequence of
   * lesson ids after a drag-and-drop operation; server rewrites every
   * `order` column in a transaction. See `reorder()` on the service for
   * validation details.
   */
  @Roles(AdminRole.EDITOR, AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Post('reorder')
  @HttpCode(200)
  async reorder(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: ReorderLessonsDto,
  ) {
    return this.lessonsService.reorder(courseId, dto.lessonIds);
  }

  @Roles(AdminRole.EDITOR, AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.lessonsService.findByIdForAdmin(id);
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
}

@ApiTags('Academy Lessons (Student)')
@Controller('academy/courses/:courseSlug/lessons')
@Realm('academy')
@UseGuards(JwtAcademyAuthGuard)
export class StudentLessonsController {
  constructor(
    private readonly lessonsService: LessonsService,
    private readonly metrics: MetricsService,
  ) {}

  @Get(':lessonSlug')
  async findOne(
    @CurrentAcademyUser() user: AcademyUserPayload,
    @Param('courseSlug') courseSlug: string,
    @Param('lessonSlug') lessonSlug: string,
    @Query('locale') localeRaw?: string,
  ) {
    const lesson = await this.lessonsService.findForStudent({
      userId: user.id,
      courseSlug,
      lessonSlug,
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    const locale = normalizeLocale(localeRaw);
    const title = pickLocalized(lesson.title, locale);
    const excerpt = pickLocalized(lesson.excerpt, locale);
    const content = pickLocalized(lesson.content, locale);
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
    };
  }
}
