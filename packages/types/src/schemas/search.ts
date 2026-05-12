import { z } from "zod";

/**
 * Global admin search — cross-entity lookup. Powers the unified ⌘K palette:
 * one query fans out across ~10 entities, each capped by `limit`, grouped in
 * the response. Designed to be thin — the UI only needs a title, subtitle,
 * deep link, and (optionally) a thumbnail per row.
 */

export const searchEntityTypeSchema = z.enum([
  "agent",
  "property",
  "developer",
  "city",
  "county",
  "bankRate",
  "testimonial",
  "article",
  "user",
  "inquiry",
]);

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(20).default(8),
  types: z
    .preprocess(
      (v) => {
        if (v == null) return undefined;
        if (typeof v === "string")
          return v
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        return v;
      },
      z.array(searchEntityTypeSchema).min(1),
    )
    .optional(),
});

export const searchResultItemSchema = z.object({
  id: z.string(),
  entity: searchEntityTypeSchema,
  title: z.string(),
  subtitle: z.string().nullable(),
  href: z.string(),
  imageUrl: z.string().nullable().optional(),
  badge: z.string().nullable().optional(),
});

/**
 * A result group. `total` is the count of matching rows that satisfy the
 * filter (role + brand + scope), so the UI can render "(N / total)" headings
 * and decide whether to show a "Show all" affordance (`total > items.length`).
 */
export const searchGroupSchema = z.object({
  entity: searchEntityTypeSchema,
  total: z.number().int().nonnegative(),
  items: z.array(searchResultItemSchema),
});

export const searchResponseSchema = z.object({
  query: z.string(),
  groups: z.array(searchGroupSchema),
  /**
   * Best match across all entity groups, surfaced as a "Top result" lead
   * row in the palette. Only filled when the user hasn't narrowed scope
   * (so promoting one entity above the rest is meaningful), at least two
   * entity groups produced hits, and the winning score is strong enough
   * (word-boundary or better) to avoid promoting weak substring matches.
   */
  topResult: searchResultItemSchema.nullable().optional(),
});

/**
 * Recent search history — items the user has actually picked from the palette
 * before. Stored server-side per `AdminUser` so the experience is consistent
 * across browsers / devices, capped at 25 rows per user with the oldest
 * dropped on overflow.
 */
export const recentSearchItemSchema = z.object({
  id: z.string(),
  entity: searchEntityTypeSchema,
  entityId: z.string(),
  title: z.string(),
  subtitle: z.string().nullable(),
  href: z.string(),
  imageUrl: z.string().nullable(),
  badge: z.string().nullable(),
  selectedAt: z.string(),
});

export const recordSearchHistorySchema = z.object({
  entity: searchEntityTypeSchema,
  entityId: z.string().min(1).max(200),
  title: z.string().min(1).max(300),
  subtitle: z.string().nullable().optional(),
  href: z.string().min(1).max(500),
  imageUrl: z.string().nullable().optional(),
  badge: z.string().nullable().optional(),
});

export const recentSearchListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(25).default(6),
});

/**
 * Total counts per entity type — drives the rail's always-visible "total
 * inventory" badges (how many properties / agents / cities exist *at all*,
 * before any query). Role-scoped and brand-scoped server-side; the payload
 * only carries entities the caller is allowed to see. Shaped as an array
 * of `{ entity, count }` rather than a record so we don't fight Zod's
 * "complete Record only" inference for enum keys.
 */
export const searchCountsResponseSchema = z.object({
  counts: z.array(
    z.object({
      entity: searchEntityTypeSchema,
      count: z.number().int().nonnegative(),
    }),
  ),
});

export type SearchEntityType = z.infer<typeof searchEntityTypeSchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
export type SearchResultItem = z.infer<typeof searchResultItemSchema>;
export type SearchGroup = z.infer<typeof searchGroupSchema>;
export type SearchResponse = z.infer<typeof searchResponseSchema>;
export type SearchCountsResponse = z.infer<typeof searchCountsResponseSchema>;
export type RecentSearchItem = z.infer<typeof recentSearchItemSchema>;
export type RecordSearchHistoryInput = z.infer<typeof recordSearchHistorySchema>;
export type RecentSearchListQuery = z.infer<typeof recentSearchListQuerySchema>;
