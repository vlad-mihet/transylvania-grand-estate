import { createZodDto } from 'nestjs-zod';
import { reorderLessonAttachmentsSchema } from '@tge/types/schemas/academy';

export class ReorderLessonAttachmentsDto extends createZodDto(
  reorderLessonAttachmentsSchema,
) {}
