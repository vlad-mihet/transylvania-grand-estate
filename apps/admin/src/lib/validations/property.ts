import { z } from "zod";

const localizedString = z.object({
  en: z.string().min(1, "English value is required"),
  ro: z.string().min(1, "Romanian value is required"),
});

export const propertySchema = z.object({
  title: localizedString,
  description: localizedString,
  shortDescription: localizedString,
  slug: z.string().min(1, "Slug is required"),
  price: z.coerce.number().min(0),
  currency: z.string(),
  type: z.enum([
    "apartment", "house", "villa", "terrain", "penthouse",
    "estate", "chalet", "mansion", "palace",
  ]),
  status: z.enum(["available", "sold", "reserved"]),
  city: z.string().min(1, "City is required"),
  citySlug: z.string().min(1),
  neighborhood: z.string().min(1, "Neighborhood is required"),
  address: localizedString,
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  bedrooms: z.coerce.number().int().min(0),
  bathrooms: z.coerce.number().int().min(0),
  area: z.coerce.number().min(0),
  landArea: z.coerce.number().optional().nullable(),
  floors: z.coerce.number().int().min(0),
  yearBuilt: z.coerce.number().int().min(1800),
  garage: z.coerce.number().int().optional().nullable(),
  pool: z.boolean(),
  features: z.array(localizedString),
  featured: z.boolean(),
  isNew: z.boolean(),
  developerId: z.string().optional().nullable(),
});

export type PropertyFormValues = z.infer<typeof propertySchema>;
