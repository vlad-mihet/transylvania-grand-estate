import { createZodDto } from 'nestjs-zod';
import { updateTestimonialSchema } from '@tge/types/schemas/testimonial';

export class UpdateTestimonialDto extends createZodDto(
  updateTestimonialSchema,
) {}
