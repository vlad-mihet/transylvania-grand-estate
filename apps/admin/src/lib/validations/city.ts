import { z } from "zod";

const localizedString = z.object({
  en: z.string().min(1, "English value is required"),
  ro: z.string().min(1, "Romanian value is required"),
  fr: z.string().optional(),
  de: z.string().optional(),
});

export const citySchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: localizedString,
  propertyCount: z.coerce.number().int().min(0),
});

export type CityFormValues = z.infer<typeof citySchema>;
