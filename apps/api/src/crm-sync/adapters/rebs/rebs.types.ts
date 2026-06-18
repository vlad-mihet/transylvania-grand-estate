import { z } from 'zod';

/**
 * Raw REBS wire shapes, zod-parsed at the network boundary so a feed-shape
 * change fails loudly in the adapter rather than deep in persistence. Kept
 * permissive on purpose: REBS sends numbers as strings, omits fields freely,
 * and `.passthrough()` tolerates fields we don't consume. These types are an
 * adapter implementation detail — nothing outside `adapters/rebs` imports them.
 */

// REBS numerics arrive as either JSON numbers or numeric strings.
const numeric = z.union([z.number(), z.string()]).nullable().optional();
const flag = z.union([z.boolean(), z.number(), z.string()]).nullable().optional();
const text = z.string().nullable().optional();

export const rebsMetaSchema = z
  .object({
    limit: z.number().optional(),
    offset: z.number().optional(),
    total_count: z.number().optional(),
    next: z.string().nullable().optional(),
    previous: z.string().nullable().optional(),
  })
  .passthrough();

export const rebsPropertySchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    internal_id: z.union([z.string(), z.number()]).nullable().optional(),
    date_modified: text,

    title: text,
    description: text,
    property_type: text,

    city: text,
    region: text,
    zone: text,
    street: text,
    landmark: text,
    location_number: z.union([z.string(), z.number()]).nullable().optional(),
    lat: numeric,
    lng: numeric,

    bedrooms: numeric,
    bathrooms: numeric,
    rooms: numeric,
    surface_total: numeric,
    surface_land: numeric,
    floor: numeric,
    building_construction_year: numeric,

    price_sale: numeric,
    price_rent: numeric,
    currency_sale: text,
    currency_rent: text,
    for_sale: flag,
    for_rent: flag,
    availability: flag,

    tags: z.array(z.string()).nullable().optional(),
    tags_en: z.array(z.string()).nullable().optional(),
    nearby: z.union([z.string(), z.array(z.string())]).nullable().optional(),
    nearby_en: z.union([z.string(), z.array(z.string())]).nullable().optional(),

    // Images are URL strings or objects carrying a url-ish field — normalized
    // in the mapper. Kept as `unknown[]` here to tolerate either shape.
    full_images: z.array(z.unknown()).nullable().optional(),
    resized_images: z.array(z.unknown()).nullable().optional(),
    sketches: z.array(z.unknown()).nullable().optional(),
    thumbnail: z.unknown().optional(),
  })
  .passthrough();

export type RebsProperty = z.infer<typeof rebsPropertySchema>;

export const rebsFeedSchema = z.object({
  meta: rebsMetaSchema.optional(),
  objects: z.array(rebsPropertySchema),
});

export type RebsFeed = z.infer<typeof rebsFeedSchema>;
