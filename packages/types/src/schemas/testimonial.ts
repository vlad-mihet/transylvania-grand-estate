import { z } from "zod";
import { localizedStringSchema } from "./_primitives";

/**
 * Testimonial — a client quote about a property or the brand. Mirrors
 * `apps/api/src/testimonials/dto/create-testimonial.dto.ts` one-for-one;
 * kept here so admin forms validate against the same rules the API enforces.
 */
export const createTestimonialSchema = z
  .object({
    clientName: z.string().min(1).max(200),
    location: z.string().min(1).max(200),
    propertyType: z.string().min(1).max(80),
    quote: localizedStringSchema,
    rating: z.coerce.number().int().min(1).max(5),
  })
  .strict();

export const updateTestimonialSchema = createTestimonialSchema.partial();

export type CreateTestimonialInput = z.infer<typeof createTestimonialSchema>;
export type UpdateTestimonialInput = z.infer<typeof updateTestimonialSchema>;
