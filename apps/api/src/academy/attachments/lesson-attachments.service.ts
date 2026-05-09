import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadsService } from '../../uploads/uploads.service';
import { ATTACHMENTS_PER_LESSON_CAP } from '../../common/config/upload.config';
import type { LessonAttachmentSummary } from '@tge/types/schemas/academy';

/**
 * Admin-side attachments management for a lesson. Storage is delegated
 * to UploadsService — this service owns the metadata row and the list
 * surface that the student lesson endpoint consumes. Cap at 10
 * attachments per lesson keeps the lesson page UI manageable; admins
 * who need more should split into multiple lessons.
 */
@Injectable()
export class LessonAttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
  ) {}

  /**
   * List attachments for a lesson, ordered by `sortOrder` ascending.
   * Used by both the admin attachments section and (indirectly) by
   * the student lesson endpoint, which composes this list into its
   * response so the lesson page stays one round-trip.
   */
  async listForLesson(lessonId: string): Promise<LessonAttachmentSummary[]> {
    const rows = await this.prisma.lessonAttachment.findMany({
      where: { lessonId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((r) => this.toSummary(r));
  }

  /**
   * Upload a fresh attachment. Enforces the 10/lesson cap before the
   * storage write so a 25 MB blob isn't pushed to R2 and then orphaned
   * by a 409. `sortOrder` is auto-assigned to the next sparse slot
   * (existing max + 10), so reorder is rarely needed for the common
   * "upload in the order you want" workflow.
   */
  async create(
    lessonId: string,
    file: Express.Multer.File,
    uploadedById: string | null,
  ): Promise<LessonAttachmentSummary> {
    await this.assertLessonExists(lessonId);

    const count = await this.prisma.lessonAttachment.count({
      where: { lessonId },
    });
    if (count >= ATTACHMENTS_PER_LESSON_CAP) {
      throw new ConflictException({
        message: `Attachment cap reached (${ATTACHMENTS_PER_LESSON_CAP})`,
        code: 'ATTACHMENT_CAP',
      });
    }

    if (!file.originalname || !file.mimetype) {
      throw new BadRequestException('Missing file metadata');
    }

    const result = await this.uploads.uploadFile(
      file,
      `academy/lessons/${lessonId}/attachments`,
    );

    // Auto-assign sortOrder to the next sparse slot. The DB-level
    // race-condition window (two concurrent uploads picking the same
    // sortOrder) is harmless — the admin reorder step rewrites it.
    const max = await this.prisma.lessonAttachment.aggregate({
      where: { lessonId },
      _max: { sortOrder: true },
    });
    const nextSortOrder = (max._max.sortOrder ?? -10) + 10;

    const row = await this.prisma.lessonAttachment.create({
      data: {
        lessonId,
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size ?? result.size,
        storagePath: result.filePath,
        sortOrder: nextSortOrder,
        uploadedById,
      },
    });
    return this.toSummary(row);
  }

  async remove(lessonId: string, attachmentId: string): Promise<void> {
    const row = await this.prisma.lessonAttachment.findFirst({
      where: { id: attachmentId, lessonId },
    });
    if (!row) throw new NotFoundException('Attachment not found');
    await this.prisma.lessonAttachment.delete({ where: { id: row.id } });
    // Best-effort storage cleanup. A leftover object costs a few KB and
    // a swallowed failure (network blip, eventual-consistency lag) must
    // not block the metadata delete that the admin already confirmed.
    await this.uploads.deleteFile(row.storagePath).catch(() => undefined);
  }

  /**
   * Atomic reorder. Client submits the full ordered sequence of
   * attachment ids; server rewrites `sortOrder` as `(index + 1) * 10`
   * inside one transaction. Rejects if the array doesn't exactly cover
   * the lesson's attachments (missing → 400, foreign id → 400).
   */
  async reorder(
    lessonId: string,
    attachmentIds: string[],
  ): Promise<{ reordered: number }> {
    await this.assertLessonExists(lessonId);

    const existing = await this.prisma.lessonAttachment.findMany({
      where: { lessonId },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((r) => r.id));
    const requestIds = new Set(attachmentIds);

    if (
      attachmentIds.length !== existing.length ||
      requestIds.size !== attachmentIds.length
    ) {
      throw new BadRequestException(
        'Reorder payload must list every attachment exactly once',
      );
    }
    for (const id of attachmentIds) {
      if (!existingIds.has(id)) {
        throw new BadRequestException(
          `Attachment ${id} does not belong to this lesson`,
        );
      }
    }

    await this.prisma.$transaction(
      attachmentIds.map((id, idx) =>
        this.prisma.lessonAttachment.update({
          where: { id },
          data: { sortOrder: (idx + 1) * 10 },
        }),
      ),
    );
    return { reordered: attachmentIds.length };
  }

  private async assertLessonExists(lessonId: string): Promise<void> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
  }

  private toSummary(
    row: Prisma.LessonAttachmentGetPayload<Record<string, never>>,
  ): LessonAttachmentSummary {
    return {
      id: row.id,
      filename: row.filename,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      // For V1 we surface the storage backend's public URL directly.
      // The combination of UUID lesson + UUID attachment makes the URL
      // unguessable; signed-URL hardening is a follow-up.
      downloadUrl: this.uploads.getPublicUrl(row.storagePath),
      sortOrder: row.sortOrder,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
