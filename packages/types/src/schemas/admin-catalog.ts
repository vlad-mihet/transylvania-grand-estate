import { z } from "zod";
import { PropertyStatus } from "@prisma/client";

/**
 * Aggregator response for `GET /admin/catalog/overview`. Single round-trip
 * collapses ~11 internal Prisma calls (counts + 5-row recents per type)
 * into one envelope. Mirrors the locale-completeness pattern: page-level
 * role gate at the controller (`@Roles(EDITOR, ADMIN, SUPER_ADMIN)`) means
 * every field is always present for any caller who can hit the endpoint.
 * Per-tile UI gating happens client-side via `<Can>`.
 */

const localizedTitleSchema = z.record(z.string(), z.string().optional());

export const recentPropertyEntrySchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: localizedTitleSchema,
  status: z.nativeEnum(PropertyStatus),
  featured: z.boolean(),
  updatedAt: z.string(),
});

export const recentDeveloperEntrySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  featured: z.boolean(),
  projectCount: z.number().int().min(0),
  updatedAt: z.string(),
});

export const recentTestimonialEntrySchema = z.object({
  id: z.string(),
  clientName: z.string(),
  rating: z.number().int().min(1).max(5),
  createdAt: z.string(),
});

export const adminCatalogOverviewSchema = z.object({
  properties: z.object({
    total: z.number().int().min(0),
    available: z.number().int().min(0),
    sold: z.number().int().min(0),
    reserved: z.number().int().min(0),
    featured: z.number().int().min(0),
    recent: z.array(recentPropertyEntrySchema).max(5),
  }),
  developers: z.object({
    total: z.number().int().min(0),
    featured: z.number().int().min(0),
    recent: z.array(recentDeveloperEntrySchema).max(5),
  }),
  testimonials: z.object({
    total: z.number().int().min(0),
    /** Mean of `rating` across all testimonials, rounded to 1 decimal.
     * Null when `total === 0` (no rows to average). */
    avgRating: z.number().min(0).max(5).nullable(),
    recent: z.array(recentTestimonialEntrySchema).max(5),
  }),
});

export type AdminCatalogOverview = z.infer<typeof adminCatalogOverviewSchema>;
export type RecentPropertyEntry = z.infer<typeof recentPropertyEntrySchema>;
export type RecentDeveloperEntry = z.infer<typeof recentDeveloperEntrySchema>;
export type RecentTestimonialEntry = z.infer<
  typeof recentTestimonialEntrySchema
>;
