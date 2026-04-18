import { z } from "zod";
import { localizedStringSchema, slugSchema } from "./_primitives";

/**
 * Developer — a real-estate developer building the listed properties.
 * Mirrors `apps/api/src/developers/dto/create-developer.dto.ts`.
 */
export const createDeveloperSchema = z
  .object({
    slug: slugSchema,
    name: z.string().min(1).max(200),
    logo: z.string().max(500).optional(),
    description: localizedStringSchema,
    shortDescription: localizedStringSchema,
    city: z.string().min(1).max(120),
    citySlug: slugSchema,
    website: z.string().url().max(500).optional(),
    projectCount: z.coerce.number().int().min(0).optional(),
    featured: z.boolean().optional(),
    coverImage: z.string().max(500).optional(),
    tagline: localizedStringSchema.optional(),
  })
  .strict();

export const updateDeveloperSchema = createDeveloperSchema.partial();

export type CreateDeveloperInput = z.infer<typeof createDeveloperSchema>;
export type UpdateDeveloperInput = z.infer<typeof updateDeveloperSchema>;
