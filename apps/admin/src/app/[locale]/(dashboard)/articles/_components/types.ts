import type { ApiArticle } from "@tge/types";

export type ArticleStatus = "draft" | "published";
export type ArticleCategory = "guide" | "news" | "market-report";

export type Article = ApiArticle & {
  status?: ArticleStatus;
  createdAt?: string;
  updatedAt?: string;
};

export const SORT_TOKENS = {
  publishedAt: { asc: "oldest", desc: "newest" },
} as const;

export const CATEGORIES: ArticleCategory[] = ["guide", "news", "market-report"];
export const STATUSES: ArticleStatus[] = ["draft", "published"];
