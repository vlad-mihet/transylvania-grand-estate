/**
 * Valid values for `Article.category`. Kept as a TS union + runtime list
 * rather than a Prisma enum because the existing wire format uses the
 * hyphenated `"market-report"` spelling, which isn't a valid Prisma enum
 * identifier. Changing to an underscored enum would churn the API wire
 * format, the Reveria frontend category filters, and message keys —
 * validating at the DTO boundary gets the safety without the churn.
 */
export const ARTICLE_CATEGORIES = ['guide', 'news', 'market-report'] as const;
export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];
