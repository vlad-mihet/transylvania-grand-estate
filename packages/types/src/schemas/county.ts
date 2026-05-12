import { z } from "zod";
import { coordinatesSchema, slugSchema } from "./_primitives";

/**
 * County — Romania's `județ` administrative unit. Lat/lng is the county's
 * centroid, used for defaulting maps when no narrower location is picked.
 * Counties are universal across brands (TGE/Revery both consume the full
 * set as a filter facet), so there's no `brands` field here — that
 * membership lives on cities only.
 * Mirrors `apps/api/src/counties/dto/create-county.dto.ts`.
 */
export const createCountySchema = z
  .object({
    name: z.string().min(1).max(120),
    slug: slugSchema,
    // Plate-style code, e.g. "CJ", "B", "TM". Short; 1–4 lets us cover
    // Bucharest ("B") and longer aliases without bloating.
    code: z.string().min(1).max(4),
    latitude: coordinatesSchema.shape.lat,
    longitude: coordinatesSchema.shape.lng,
  })
  .strict();

/**
 * All fields optional — admin partial-update endpoint. Renaming a county is
 * the common case (typo fix in the create form); changing slug invalidates
 * any cached public URLs that included it, so the UI should warn before
 * sending. Mirrors `apps/api/src/counties/dto/update-county.dto.ts`.
 */
export const updateCountySchema = createCountySchema.partial().strict();

export type CreateCountyInput = z.infer<typeof createCountySchema>;
export type UpdateCountyInput = z.infer<typeof updateCountySchema>;
