import { createZodDto } from 'nestjs-zod';
import { academyRefreshSchema } from '@tge/types/schemas/academy';

export class AcademyRefreshDto extends createZodDto(academyRefreshSchema) {}
