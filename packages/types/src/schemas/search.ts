import { z } from "zod";

/**
 * Global admin search — cross-entity lookup. Powers the header search bar:
 * one query fans out across ~10 entities, each capped by `limit`, grouped in
 * the response. Designed to be thin — the UI only needs a title, subtitle,
 * and deep link per row.
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
  limit: z.coerce.number().int().min(1).max(20).default(5),
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
 * A result group. `hasMore` is true when the server truncated the list at
 * `limit` — callers use it to render a "Show all" affordance. We intentionally
 * do NOT return a total count: exact totals require a second Prisma query per
 * entity (doubling load) and aren't needed by the type-ahead UI.
 */
export const searchGroupSchema = z.object({
  entity: searchEntityTypeSchema,
  hasMore: z.boolean(),
  items: z.array(searchResultItemSchema),
});

export const searchResponseSchema = z.object({
  query: z.string(),
  groups: z.array(searchGroupSchema),
});

export type SearchEntityType = z.infer<typeof searchEntityTypeSchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
export type SearchResultItem = z.infer<typeof searchResultItemSchema>;
export type SearchGroup = z.infer<typeof searchGroupSchema>;
export type SearchResponse = z.infer<typeof searchResponseSchema>;
