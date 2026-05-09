import { z } from "zod";
import { ArticleStatus } from "@prisma/client";
import {
  articleCategorySchema,
  createArticleSchema,
} from "@tge/types/schemas/article";

/**
 * Unified form schema for article create + edit. Pages strip `status` on
 * create (server-side default = `draft`) and include it on edit.
 *
 * `readTimeMinutes` is overridden to drop the upstream `z.coerce.number()`:
 * coerce gives Zod a different input vs. output type (`unknown` → `number`),
 * which react-hook-form's resolver inference treats as a generic mismatch.
 * The form already coerces via `setValueAs: Number(...)` before validation.
 */
export const articleFormSchema = z.object({
  ...createArticleSchema.shape,
  readTimeMinutes: z.number().int().min(1).max(120).optional(),
  status: z.nativeEnum(ArticleStatus).optional(),
});
export type ArticleFormValues = z.infer<typeof articleFormSchema>;

export const ARTICLE_STATUSES: readonly ArticleStatus[] = [
  ArticleStatus.draft,
  ArticleStatus.published,
];

export const ARTICLE_CATEGORIES = articleCategorySchema.options;
export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];
