import { z } from "zod";
import { ArticleStatus } from "@prisma/client";
import { localizedStringSchema, paginationSchema, slugSchema } from "./_primitives";

/**
 * Article category — kept as a string literal union rather than a Prisma
 * enum because the wire format uses hyphenated "market-report" which isn't
 * a valid Prisma enum identifier. See `apps/api/src/articles/article-category.ts`.
 */
export const articleCategorySchema = z.enum(["guide", "news", "market-report"]);
export type ArticleCategory = z.infer<typeof articleCategorySchema>;

/**
 * Article — long-form editorial content. Mirrors
 * `apps/api/src/articles/dto/create-article.dto.ts`.
 */
export const createArticleSchema = z
  .object({
    slug: slugSchema,
    title: localizedStringSchema,
    excerpt: localizedStringSchema,
    content: localizedStringSchema,
    coverImage: z.string().min(1).max(500),
    category: articleCategorySchema,
    tags: z.array(z.string().max(80)).optional(),
    // ISO 8601 datetime (preserves the `@IsDateString` semantics the prior
    // DTO enforced rather than auto-coercing to a Date object).
    publishedAt: z.string().datetime().optional(),
    authorName: z.string().min(1).max(200),
    authorAvatar: z.string().max(500).optional(),
    readTimeMinutes: z.coerce.number().int().min(1).optional(),
  })
  .strict();

export const updateArticleSchema = createArticleSchema
  .partial()
  .extend({
    status: z.nativeEnum(ArticleStatus).optional(),
  })
  .strict();

export const queryArticleSchema = paginationSchema.extend({
  category: articleCategorySchema.optional(),
  status: z.nativeEnum(ArticleStatus).optional(),
  search: z.string().max(200).optional(),
  sort: z.enum(["newest", "oldest"]).optional(),
});

export type CreateArticleInput = z.infer<typeof createArticleSchema>;
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;
export type QueryArticleInput = z.infer<typeof queryArticleSchema>;
