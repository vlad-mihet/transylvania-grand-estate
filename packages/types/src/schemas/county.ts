import { z } from "zod";
import { coordinatesSchema, slugSchema } from "./_primitives";

/**
 * County — Romania's `județ` administrative unit. Lat/lng is the county's
 * centroid, used for defaulting maps when no narrower location is picked.
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

export type CreateCountyInput = z.infer<typeof createCountySchema>;
