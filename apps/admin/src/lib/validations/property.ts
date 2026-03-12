import { z } from "zod";

const localizedString = z.object({
  en: z.string().min(1, "English value is required"),
  ro: z.string().min(1, "Romanian value is required"),
  fr: z.string().optional(),
  de: z.string().optional(),
});

const propertyTypes = [
  "apartment", "house", "villa", "terrain", "penthouse",
  "estate", "chalet", "mansion", "palace",
] as const;

export const propertySchema = z.object({
  title: localizedString,
  description: localizedString,
  shortDescription: localizedString,
  slug: z.string().min(1, "Slug is required"),
  price: z.coerce.number().min(0),
  currency: z.string(),
  type: z.enum(propertyTypes),
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
  yearBuilt: z.coerce.number().int().min(0),
  garage: z.coerce.number().int().optional().nullable(),
  pool: z.boolean(),
  features: z.array(localizedString),
  featured: z.boolean(),
  isNew: z.boolean(),
  developerId: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.type !== "terrain" && data.yearBuilt < 1800) {
    ctx.addIssue({
      code: z.ZodIssueCode.too_small,
      minimum: 1800,
      type: "number",
      inclusive: true,
      message: "Year built must be at least 1800",
      path: ["yearBuilt"],
    });
  }
});

export type PropertyFormValues = z.infer<typeof propertySchema>;
