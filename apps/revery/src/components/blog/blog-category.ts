export const CATEGORIES = ["all", "guide", "news", "market-report"] as const;
export type BlogCategory = (typeof CATEGORIES)[number];

export function isBlogCategory(v: unknown): v is BlogCategory {
  return typeof v === "string" && (CATEGORIES as readonly string[]).includes(v);
}
