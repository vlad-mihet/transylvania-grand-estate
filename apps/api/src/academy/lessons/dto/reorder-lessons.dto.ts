import { createZodDto } from 'nestjs-zod';
import { reorderLessonsSchema } from '@tge/types/schemas/academy';

export class ReorderLessonsDto extends createZodDto(reorderLessonsSchema) {}
