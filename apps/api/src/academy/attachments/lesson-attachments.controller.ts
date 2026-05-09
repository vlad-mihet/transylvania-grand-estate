import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';
import { LessonAttachmentsService } from './lesson-attachments.service';
import { ReorderLessonAttachmentsDto } from './dto/reorder-attachments.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { DOCUMENT_UPLOAD_SINGLE } from '../../common/config/upload.config';
import { ValidateDocumentUploadInterceptor } from '../../common/interceptors/validate-document-upload.interceptor';

/**
 * Admin endpoints for lesson attachments. The student lesson endpoint
 * inlines the attachment list into its response, so there's no
 * student-facing controller here — read access flows through the
 * existing `/academy/courses/:courseSlug/lessons/:lessonSlug` path.
 *
 * Permission floors:
 *  - EDITOR+ for upload + reorder (matches lesson-content edit floor)
 *  - ADMIN+ for delete (matches the destructive-action threshold used
 *    by `deleteCoverImage` and `removeLesson`)
 */
@ApiTags('Academy Lesson Attachments (Admin)')
@Controller('admin/academy/lessons/:lessonId/attachments')
export class LessonAttachmentsController {
  constructor(
    private readonly attachmentsService: LessonAttachmentsService,
  ) {}

  @Roles(AdminRole.EDITOR, AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Get()
  list(@Param('lessonId', ParseUUIDPipe) lessonId: string) {
    return this.attachmentsService.listForLesson(lessonId);
  }

  /**
   * Single-file upload, multipart field "file". 25 MB cap, doc-only
   * mime allowlist enforced by `DOCUMENT_UPLOAD_SINGLE` and the magic-
   * byte interceptor. Cap of 10 attachments / lesson is enforced by
   * the service before the storage write.
   */
  @Roles(AdminRole.EDITOR, AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Post()
  @UseInterceptors(
    FileInterceptor('file', DOCUMENT_UPLOAD_SINGLE),
    ValidateDocumentUploadInterceptor,
  )
  async create(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { user?: { id?: string } },
  ) {
    if (!file) {
      throw new BadRequestException(
        'No file received — attach it to the `file` multipart field',
      );
    }
    return this.attachmentsService.create(
      lessonId,
      file,
      req.user?.id ?? null,
    );
  }

  @Roles(AdminRole.EDITOR, AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Post('reorder')
  @HttpCode(200)
  async reorder(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: ReorderLessonAttachmentsDto,
  ) {
    return this.attachmentsService.reorder(lessonId, dto.attachmentIds);
  }

  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.attachmentsService.remove(lessonId, id);
  }
}
