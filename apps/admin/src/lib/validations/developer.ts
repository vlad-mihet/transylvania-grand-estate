import { z } from "zod";

const localizedString = z.object({
  en: z.string().min(1, "English value is required"),
  ro: z.string().min(1, "Romanian value is required"),
});

export const developerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: localizedString,
  shortDescription: localizedString,
  city: z.string().min(1, "City is required"),
  citySlug: z.string().min(1),
  website: z.string().url().optional().or(z.literal("")),
  projectCount: z.coerce.number().int().min(0),
  featured: z.boolean(),
});

export type DeveloperFormValues = z.infer<typeof developerSchema>;
