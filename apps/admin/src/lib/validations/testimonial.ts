import { z } from "zod";
import { createTestimonialSchema } from "@tge/types/schemas/testimonial";

// Override `rating` with plain `z.number()` so the form's input type aligns
// with its output type (zod v4's `z.coerce.number()` types input as
// `unknown`, which clashes with react-hook-form's `useForm<T>` generic).
// The shared schema keeps `z.coerce.number()` for the API boundary.
export const testimonialSchema = createTestimonialSchema.extend({
  rating: z.number().int().min(1).max(5),
});

export type TestimonialFormValues = z.infer<typeof testimonialSchema>;
