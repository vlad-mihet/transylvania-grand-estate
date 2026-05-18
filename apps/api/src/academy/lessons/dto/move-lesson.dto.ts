import { createZodDto } from 'nestjs-zod';
import { moveLessonSchema } from '@tge/types/schemas/academy';

export class MoveLessonDto extends createZodDto(moveLessonSchema) {}
