import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
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
import {
  CreateCourseDto,
  UpdateCourseDto,
  QueryCourseDto,
} from './dto/courses.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Realm } from '../../common/decorators/realm.decorator';
import { IMAGE_UPLOAD_SINGLE } from '../../common/config/upload.config';
import { ValidateUploadInterceptor } from '../../common/interceptors/validate-upload.interceptor';
import { JwtAcademyAuthGuard } from '../auth/guards/jwt-academy-auth.guard';
import { EnrolledGuard } from '../guards/enrolled.guard';
import {
  CurrentAcademyUser,
  type AcademyUserPayload,
} from '../../common/decorators/academy-user.decorator';
import { pickLocalized, normalizeLocale } from '../utils/locale-fallback';
import { computeReadingTimeMinutes } from '@tge/types/utils/reading-time';

/**
 * Split into two controller classes so the @UseGuards stacks stay clean —
 * admin routes ride the global JwtAuthGuard + RolesGuard, student routes
 * ride JwtAcademyAuthGuard + EnrolledGuard. Mixing them on one class would
 * force per-route guard annotation everywhere.
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

  @Roles(AdminRole.EDITOR, AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Post()
  async create(@Body() dto: CreateCourseDto) {
    return this.coursesService.create(dto);
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
@UseGuards(JwtAcademyAuthGuard, EnrolledGuard)
export class StudentCoursesController {
  constructor(private readonly coursesService: CoursesService) {}

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
    }));
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
      servedLocale: title.servedLocale,
      localizedTitle: title.text,
      localizedDescription: description.text,
      lessons: course.lessons.map((l) => {
        const lessonContent = pickLocalized(l.content, locale);
        return {
          id: l.id,
          slug: l.slug,
          order: l.order,
          title: l.title,
          excerpt: l.excerpt,
          type: l.type,
          readingTimeMinutes:
            l.type === 'text'
              ? computeReadingTimeMinutes(lessonContent.text)
              : null,
          videoDurationSeconds:
            l.type === 'video' ? l.videoDurationSeconds : null,
          publishedAt: l.publishedAt?.toISOString() ?? null,
        };
      }),
    };
  }
}
