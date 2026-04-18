import { createZodDto } from 'nestjs-zod';
import { updateIndicatorSchema } from '@tge/types/schemas/financial-data';

export class UpdateIndicatorDto extends createZodDto(updateIndicatorSchema) {}
