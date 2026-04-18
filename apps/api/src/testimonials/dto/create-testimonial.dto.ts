import { createZodDto } from 'nestjs-zod';
import { createTestimonialSchema } from '@tge/types/schemas/testimonial';

export class CreateTestimonialDto extends createZodDto(
  createTestimonialSchema,
) {}
