import { z } from "zod";
import {
  PropertyType,
  PropertyStatus,
  PropertyTier,
  Furnishing,
  ConstructionMaterial,
  PropertyCondition,
  SellerType,
  HeatingType,
  OwnershipType,
  WindowType,
} from "@prisma/client";
import {
  amenityFlagsSchema,
  amenityQueryFlagsSchema,
  coordinatesSchema,
  geoFilterSchema,
  localizedStringSchema,
  paginationSchema,
  queryBoolSchema,
  slugSchema,
} from "./_primitives";

/**
 * Property — the central resource. Create body mirrors
 * `apps/api/src/properties/dto/create-property.dto.ts` plus the 18 amenity
 * flags from `PropertyAmenitiesDto`. Amenities are spread at the top level
 * (the DB columns are flat) rather than nested under `amenities` — keeping
 * the wire format stable during the Zod migration. Phase 5.4 can group them
 * into a sub-object once the DB writes move to object-spread.
 */
export const createPropertySchema = amenityFlagsSchema
  .extend({
    slug: slugSchema,
    title: localizedStringSchema,
    description: localizedStringSchema,
    shortDescription: localizedStringSchema,
    price: z.coerce.number().min(0),
    currency: z.string().min(3).max(10).optional(),
    type: z.nativeEnum(PropertyType),
    status: z.nativeEnum(PropertyStatus).optional(),
    tier: z.nativeEnum(PropertyTier).optional(),
    city: z.string().min(1).max(120),
    citySlug: slugSchema,
    neighborhood: z.string().min(1).max(120),
    address: localizedStringSchema,
    coordinates: coordinatesSchema,
    bedrooms: z.coerce.number().int().min(0),
    bathrooms: z.coerce.number().int().min(0),
    area: z.coerce.number().min(0),
    landArea: z.coerce.number().min(0).optional(),
    floors: z.coerce.number().int().min(0),
    yearBuilt: z.coerce.number().int(),
    garage: z.coerce.number().int().optional(),
    pool: z.boolean().optional(),
    floor: z.coerce.number().int().optional(),
    furnishing: z.nativeEnum(Furnishing).optional(),
    material: z.nativeEnum(ConstructionMaterial).optional(),
    condition: z.nativeEnum(PropertyCondition).optional(),
    sellerType: z.nativeEnum(SellerType).optional(),
    heating: z.nativeEnum(HeatingType).optional(),
    ownership: z.nativeEnum(OwnershipType).optional(),
    windowType: z.nativeEnum(WindowType).optional(),
    // Preserve `@IsDateString()` semantics — accept an ISO string, don't
    // auto-convert to Date (service handles `new Date()` where needed).
    availabilityDate: z.string().datetime().optional(),
    features: z.array(localizedStringSchema).optional(),
    featured: z.boolean().optional(),
    isNew: z.boolean().optional(),
    developerId: z.string().uuid().optional(),
    agentId: z.string().uuid().optional(),
  })
  .strict();

export const updatePropertySchema = createPropertySchema.partial();

/**
 * List/query params. `.strict()` deliberately NOT applied — browser
 * extensions and analytics sometimes append cache-buster params, and a
 * rejected GET is worse than a quietly-stripped unknown key.
 */
export const queryPropertySchema = paginationSchema
  .merge(geoFilterSchema)
  .merge(amenityQueryFlagsSchema)
  .extend({
    city: z.string().max(120).optional(),
    county: z.string().max(120).optional(),
    type: z.nativeEnum(PropertyType).optional(),
    status: z.nativeEnum(PropertyStatus).optional(),
    tier: z.nativeEnum(PropertyTier).optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    // Exact-match multi-select (e.g. "show me 2- AND 4-bedroom properties").
    // Accepts repeated keys (`?bedrooms=2&bedrooms=4`) or a single value.
    // `minBedrooms` still applies alongside (used by the client's "6+"
    // bucket); when both are present the service ORs them together.
    bedrooms: z
      .preprocess(
        (v) => {
          if (v == null) return undefined;
          return Array.isArray(v) ? v : [v];
        },
        z.array(z.coerce.number().int().min(0)),
      )
      .optional(),
    minBedrooms: z.coerce.number().int().min(0).optional(),
    maxBedrooms: z.coerce.number().int().min(0).optional(),
    minBathrooms: z.coerce.number().int().min(0).optional(),
    maxBathrooms: z.coerce.number().int().min(0).optional(),
    minArea: z.coerce.number().min(0).optional(),
    maxArea: z.coerce.number().min(0).optional(),
    featured: queryBoolSchema.optional(),
    developerId: z.string().optional(),
    agentId: z.string().optional(),
    isNew: queryBoolSchema.optional(),
    minFloor: z.coerce.number().int().optional(),
    maxFloor: z.coerce.number().int().optional(),
    minYearBuilt: z.coerce.number().int().optional(),
    maxYearBuilt: z.coerce.number().int().optional(),
    furnishing: z.nativeEnum(Furnishing).optional(),
    material: z.nativeEnum(ConstructionMaterial).optional(),
    condition: z.nativeEnum(PropertyCondition).optional(),
    sellerType: z.nativeEnum(SellerType).optional(),
    heating: z.nativeEnum(HeatingType).optional(),
    ownership: z.nativeEnum(OwnershipType).optional(),
    windowType: z.nativeEnum(WindowType).optional(),
    hasImages: queryBoolSchema.optional(),
    postedWithin: z.enum(["day", "3days", "7days"]).optional(),
    sort: z.enum(["price_asc", "price_desc", "newest", "oldest"]).optional(),
    search: z.string().max(200).optional(),
  });

/**
 * Property image metadata patch. Only `alt`, `isHero`, and `sortOrder` are
 * editable post-upload; the `src` comes from the uploads service.
 */
export const updatePropertyImageSchema = z
  .object({
    alt: localizedStringSchema.optional(),
    isHero: z.boolean().optional(),
    sortOrder: z.coerce.number().int().optional(),
  })
  .strict();

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
export type QueryPropertyInput = z.infer<typeof queryPropertySchema>;
export type UpdatePropertyImageInput = z.infer<typeof updatePropertyImageSchema>;
