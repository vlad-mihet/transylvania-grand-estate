import { createZodDto } from 'nestjs-zod';
import { academyLoginSchema } from '@tge/types/schemas/academy';

export class AcademyLoginDto extends createZodDto(academyLoginSchema) {}
