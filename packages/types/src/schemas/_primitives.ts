import { z } from "zod";

/**
 * Shared schema primitives consumed by every resource schema. Kept in a
 * single module so field-level rules (max length, diacritic-friendly slug
 * regex, locale keys) don't drift between resources.
 */

// Upper bound matches the class-validator `LOCALIZED_MAX_LENGTH` in
// apps/api/src/common/dto/localized-string.dto.ts — long property
// descriptions need the headroom; titles and addresses stay well under it.
export const LOCALIZED_MAX_LENGTH = 5000;

export const localizedStringSchema = z.object({
  ro: z.string().min(1).max(LOCALIZED_MAX_LENGTH),
  en: z.string().min(1).max(LOCALIZED_MAX_LENGTH),
  fr: z.string().max(LOCALIZED_MAX_LENGTH).optional(),
  de: z.string().max(LOCALIZED_MAX_LENGTH).optional(),
});

export type LocalizedStringInput = z.infer<typeof localizedStringSchema>;

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// Slugs are URL path segments: lowercase letters, digits, and dashes.
// Min 2 catches typos; max 120 keeps URLs readable.
export const slugSchema = z
  .string()
  .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, digits, or dashes")
  .min(2)
  .max(120);

export const moneyEurSchema = z.coerce.number().nonnegative();

export const coordinatesSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export type CoordinatesInput = z.infer<typeof coordinatesSchema>;

/**
 * Boolean query parameter. `z.coerce.boolean()` treats the string `"false"`
 * as truthy (JS Boolean("false") === true), which is the opposite of what
 * every caller expects. This schema does it safely by matching literal
 * strings — also accepts a raw boolean for JSON bodies.
 */
export const queryBoolSchema = z.union([
  z.boolean(),
  z.enum(["true", "false"]).transform((v) => v === "true"),
]);

/**
 * Shared geo filter — radius search (center + km) and / or map viewport
 * bounding box (sw/ne corners). Query-coerced so numbers can arrive as
 * strings. Mirrors `apps/api/src/common/dto/geo-filter.dto.ts`.
 */
export const geoFilterSchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(0).optional(),
  swLat: z.coerce.number().min(-90).max(90).optional(),
  swLng: z.coerce.number().min(-180).max(180).optional(),
  neLat: z.coerce.number().min(-90).max(90).optional(),
  neLng: z.coerce.number().min(-180).max(180).optional(),
});

/**
 * 18 amenity keys driving the Property boolean columns. Mirrors what used
 * to live in `apps/api/src/properties/dto/property-amenities.dto.ts`.
 */
export const AMENITY_FLAG_KEYS = [
  "hasBalcony",
  "hasTerrace",
  "hasParking",
  "hasGarage",
  "hasSeparateKitchen",
  "hasStorage",
  "hasElevator",
  "hasInteriorStaircase",
  "hasWashingMachine",
  "hasFridge",
  "hasStove",
  "hasOven",
  "hasAC",
  "hasBlinds",
  "hasArmoredDoors",
  "hasIntercom",
  "hasInternet",
  "hasCableTV",
] as const;

export type AmenityFlagKey = (typeof AMENITY_FLAG_KEYS)[number];

/**
 * Plain-boolean amenity shape for JSON bodies (create/update). Matches
 * what admin forms submit and keeps react-hook-form's `useForm<T>` happy
 * (no union/coerced input types).
 */
export const amenityFlagsSchema = z.object(
  Object.fromEntries(
    AMENITY_FLAG_KEYS.map((k) => [k, z.boolean().optional()]),
  ) as Record<AmenityFlagKey, z.ZodOptional<z.ZodBoolean>>,
);

/**
 * Query-string variant that accepts `"true"`/`"false"` (and raw booleans)
 * for filter URLs like `?hasBalcony=true`. Used only in the property
 * list-query schema.
 */
export const amenityQueryFlagsSchema = z.object(
  Object.fromEntries(
    AMENITY_FLAG_KEYS.map((k) => [k, queryBoolSchema.optional()]),
  ) as Record<AmenityFlagKey, z.ZodOptional<typeof queryBoolSchema>>,
);

export type AmenityFlagsInput = z.infer<typeof amenityFlagsSchema>;
export type GeoFilterInput = z.infer<typeof geoFilterSchema>;
