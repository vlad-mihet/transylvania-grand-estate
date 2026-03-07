import { z } from "zod";

const localizedString = z.object({
  en: z.string().min(1, "English value is required"),
  ro: z.string().min(1, "Romanian value is required"),
});

export const testimonialSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  location: z.string().min(1, "Location is required"),
  propertyType: z.string().min(1, "Property type is required"),
  quote: localizedString,
  rating: z.coerce.number().int().min(1).max(5),
});

export type TestimonialFormValues = z.infer<typeof testimonialSchema>;
