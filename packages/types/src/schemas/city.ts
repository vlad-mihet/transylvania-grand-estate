import { z } from "zod";
import { localizedStringSchema, slugSchema } from "./_primitives";

/**
 * City — a populated place that properties and developers anchor to.
 * `countySlug` has been required since the `make_city_county_required`
 * migration; admin UI picks a county before submitting, the service resolves
 * the slug to the FK. Mirrors `apps/api/src/cities/dto/create-city.dto.ts`.
 */
export const createCitySchema = z
  .object({
    name: z.string().min(1).max(120),
    slug: slugSchema,
    countySlug: slugSchema,
    description: localizedStringSchema,
    image: z.string().max(500).optional(),
    propertyCount: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export const updateCitySchema = createCitySchema.partial();

export type CreateCityInput = z.infer<typeof createCitySchema>;
export type UpdateCityInput = z.infer<typeof updateCitySchema>;
