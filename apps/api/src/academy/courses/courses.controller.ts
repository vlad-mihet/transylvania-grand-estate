import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { CoursesService } from './courses.service';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import {
  CreateCourseDto,
  DuplicateCourseDto,
  UpdateCourseDto,
  QueryCourseDto,
  StudentCatalogQueryDto,
} from './dto/courses.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Realm } from '../../common/decorators/realm.decorator';
import { IMAGE_UPLOAD_SINGLE } from '../../common/config/upload.config';
import { ValidateUploadInterceptor } from '../../common/interceptors/validate-upload.interceptor';
import { JwtAcademyAuthGuard } from '../auth/guards/jwt-academy-auth.guard';
import {
  CurrentAcademyUser,
  type AcademyUserPayload,
} from '../../common/decorators/academy-user.decorator';
import { pickLocalized, normalizeLocale } from '../utils/locale-fallback';

/**
 * Split into two controller classes so the @UseGuards stacks stay clean —
 * admin routes ride the global JwtAuthGuard + RolesGuard, student routes
 * ride JwtAcademyAuthGuard and enforce per-course access at the service
 * layer (public visibility OR matching enrollment). Mixing the two surfaces
 * on one class would force per-route guard annotation everywhere.
 */
@ApiTags('Academy Courses (Admin)')
@Controller('admin/academy/courses')
export class AdminCoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Roles(AdminRole.EDITOR, AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Get()
  async findAll(@Query() query: QueryCourseDto) {
    return this.coursesService.findAll(query);
  }

  @Roles(AdminRole.EDITOR, AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.coursesService.findById(id);
  }

  /**
   * Blast-radius preview for the confirm-delete dialog. ADMIN+ matches
   * the DELETE permission so editors see the same gate for both actions.
   */
  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Get(':id/delete-impact')
  async deleteImpact(@Param('id', ParseUUIDPipe) id: string) {
    return this.coursesService.deleteImpact(id);
  }

  /**
   * Course-level completion stats for the admin course detail page.
   * EDITOR+ matches the read-side floor: anyone allowed to view course
   * metadata can see how it's performing.
   */
  @Roles(AdminRole.EDITOR, AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Get(':id/stats')
  async stats(@Param('id', ParseUUIDPipe) id: string) {
    return this.coursesService.computeStats(id);
  }

  /**
   * CSV roster of per-course enrollments. ADMIN+ matches the level needed
   * to manage enrollments — readers shouldn't be able to download a list
   * of a course's students.
   */
  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Get(':id/enrollments.csv')
  @Header('Cache-Control', 'no-store')
  enrollmentsCsv(@Param('id', ParseUUIDPipe) id: string) {
    return this.coursesService.enrollmentsCsv(id);
  }

  /**
   * CSV of per-student progress against this course (completion ratio,
   * last seen, resume lesson). Wildcard holders are included since they
   * can read the course.
   */
  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Get(':id/progress.csv')
  @Header('Cache-Control', 'no-store')
  progressCsv(@Param('id', ParseUUIDPipe) id: string) {
    return this.coursesService.progressCsv(id);
  }

  @Roles(AdminRole.EDITOR, AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Post()
  async create(@Body() dto: CreateCourseDto) {
    return this.coursesService.create(dto);
  }

  /**
   * Clone an existing course into a fresh draft. Use case: editor
   * wants to mirror a course's structure (e.g. start the German
   * version from the Romanian one). Lessons opt-in via `copyLessons`.
   */
  @Roles(AdminRole.EDITOR, AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Post(':id/duplicate')
  async duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DuplicateCourseDto,
  ) {
    return this.coursesService.duplicate(id, dto);
  }

  @Roles(AdminRole.EDITOR, AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.coursesService.update(id, dto);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.coursesService.remove(id);
  }

  /**
   * Single-file upload for the course cover. Reuses the property-side
   * multer config (5MB JPEG/PNG/WebP/AVIF, no SVG) and the magic-byte
   * validator so a mis-labeled mimetype can't slip through. EDITOR+ can
   * swap the image; ADMIN+ is needed to clear it entirely (matches the
   * destructive-action threshold).
   */
  @Roles(AdminRole.EDITOR, AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Post(':id/cover-image')
  @UseInterceptors(
    FileInterceptor('image', IMAGE_UPLOAD_SINGLE),
    ValidateUploadInterceptor,
  )
  async uploadCoverImage(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'No file received — attach it to the `image` field',
      );
    }
    return this.coursesService.setCoverImage(id, file);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Delete(':id/cover-image')
  async deleteCoverImage(@Param('id', ParseUUIDPipe) id: string) {
    return this.coursesService.clearCoverImage(id);
  }
}

@ApiTags('Academy Courses (Student)')
@Controller('academy/courses')
@Realm('academy')
@UseGuards(JwtAcademyAuthGuard)
export class StudentCoursesController {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  @Get()
  async findAll(@CurrentAcademyUser() user: AcademyUserPayload) {
    const courses = await this.coursesService.findAllForStudent(user.id);
    return courses.map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      description: c.description,
      coverImage: c.coverImage,
      lessonCount: c._count.lessons,
      order: c.order,
      publishedAt: c.publishedAt?.toISOString() ?? null,
      visibility: c.visibility,
      enrolled: c.enrolled,
      canUnenroll: c.canUnenroll,
      progress: {
        totalLessons: c.progress.totalLessons,
        completedLessons: c.progress.completedLessons,
        lastSeenAt: c.progress.lastSeenAt?.toISOString() ?? null,
        resumeLessonSlug: c.progress.resumeLessonSlug,
      },
    }));
  }

  /**
   * Public catalog — no enrollment required. Declared before `:slug` so the
   * literal "catalog" path never gets shadowed by slug matching.
   *
   * Paginated `{ data, meta }` so the academy /catalog page can render
   * page-numbered navigation. The shape mirrors the admin endpoints; the
   * frontend reuses its standard envelope-aware fetch.
   */
  @Get('catalog')
  async findCatalog(
    @CurrentAcademyUser() user: AcademyUserPayload,
    @Query() query: StudentCatalogQueryDto,
  ) {
    const { page = 1, limit = 12, search } = query;
    const result = await this.coursesService.findAllPublic({
      userId: user.id,
      page,
      limit,
      search,
    });
    return {
      data: result.data.map((c) => ({
        id: c.id,
        slug: c.slug,
        title: c.title,
        description: c.description,
        coverImage: c.coverImage,
        lessonCount: c._count.lessons,
        order: c.order,
        publishedAt: c.publishedAt?.toISOString() ?? null,
        visibility: c.visibility,
        enrolled: c.enrolled,
        canUnenroll: c.canUnenroll,
        progress: {
          totalLessons: c.progress.totalLessons,
          completedLessons: c.progress.completedLessons,
          lastSeenAt: c.progress.lastSeenAt?.toISOString() ?? null,
          resumeLessonSlug: c.progress.resumeLessonSlug,
        },
      })),
      meta: result.meta,
    };
  }

  /**
   * Student self-service enroll in a public course. Idempotent — double
   * clicks and stale catalog state re-hit this endpoint harmlessly. Returns
   * 403 if the slug points at an `enrolled`-visibility course (admin grant
   * required); 404 if the slug doesn't exist or isn't published.
   */
  @Post(':slug/enroll')
  @HttpCode(200)
  async enrollInCourse(
    @CurrentAcademyUser() user: AcademyUserPayload,
    @Param('slug') slug: string,
  ) {
    const result = await this.enrollmentsService.selfEnrollInPublicCourse(
      user.id,
      slug,
    );
    return { enrolled: result.enrolled };
  }

  /**
   * Student self-service unenroll from the same course. Only soft-revokes
   * the caller's per-course, self-service row — admin grants and
   * wildcards are out of scope (404 when the caller has neither).
   */
  @Delete(':slug/enroll')
  @HttpCode(200)
  async unenrollFromCourse(
    @CurrentAcademyUser() user: AcademyUserPayload,
    @Param('slug') slug: string,
  ) {
    return this.enrollmentsService.selfUnenrollFromCourse(user.id, slug);
  }

  @Get(':slug')
  async findBySlug(
    @CurrentAcademyUser() user: AcademyUserPayload,
    @Param('slug') slug: string,
    @Query('locale') localeRaw?: string,
  ) {
    const course = await this.coursesService.findBySlugForStudent(user.id, slug);
    if (!course) throw new NotFoundException('Course not found');
    const locale = normalizeLocale(localeRaw);
    const title = pickLocalized(course.title, locale);
    const description = pickLocalized(course.description, locale);
    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      coverImage: course.coverImage,
      publishedAt: course.publishedAt?.toISOString() ?? null,
      visibility: course.visibility,
      enrolled: course.enrolled,
      canUnenroll: course.canUnenroll,
      // Slug of the first published lesson — used as the start-button
      // fallback when the student has never opened the course.
      firstLessonSlug: course.firstLessonSlug,
      progress: {
        totalLessons: course.progress.totalLessons,
        completedLessons: course.progress.completedLessons,
        lastSeenAt: course.progress.lastSeenAt?.toISOString() ?? null,
        resumeLessonSlug: course.progress.resumeLessonSlug,
        // 1-based index of the resume lesson in the published list. Lets
        // the academy TOC auto-jump to the page containing that lesson.
        resumeLessonPosition: course.progress.resumeLessonPosition,
      },
      servedLocale: title.servedLocale,
      localizedTitle: title.text,
      localizedDescription: description.text,
    };
  }
}
