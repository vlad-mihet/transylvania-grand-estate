"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ApiArticle } from "@tge/types";

import { Link } from "@/i18n/navigation";
import { apiClient } from "@/lib/api-client";
import { usePermissions } from "@/components/auth/auth-provider";
import { EmptyState, ErrorState } from "@tge/ui";
import { MonoTag } from "@/components/shared/mono";
import { RelativeTime } from "@/components/shared/relative-time";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";

type ArticleRow = ApiArticle & {
  status?: "draft" | "published";
  createdAt?: string;
  updatedAt?: string;
};

export function RecentArticles() {
  const t = useTranslations("Dashboard");
  const tArticles = useTranslations("Articles");
  const tc = useTranslations("Common");
  const locale = useLocale();
  const { can } = usePermissions();
  const enabled = can("article.read");

  const categoryLabel = (category: string): string => {
    const key = `categoryLabel.${category}` as Parameters<typeof tArticles.has>[0];
    return tArticles.has(key)
      ? tArticles(key as Parameters<typeof tArticles>[0])
      : category.replace(/-/g, " ");
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard-recent-articles"],
    queryFn: () => apiClient<ArticleRow[]>("/articles?limit=5&sort=newest"),
    enabled,
    staleTime: 30_000,
  });

  if (!enabled) return null;

  const items = Array.isArray(data) ? data : [];

  const getTitle = (a: ArticleRow): string =>
    (a.title as Record<string, string>)[locale] ?? a.title.en ?? a.slug;

  return (
    <SectionCard
      title={t("recentArticles")}
      headerActions={
        <Link
          href="/articles"
          className="mono text-[11px] font-semibold uppercase tracking-[0.06em] text-copper hover:text-[var(--color-copper-dark)]"
        >
          {t("viewAll")} →
        </Link>
      }
    >
      {isError ? (
        <ErrorState
          title={tc("loadError")}
          description=""
          retryLabel={tc("tryAgain")}
          onRetry={() => refetch()}
        />
      ) : isLoading ? (
        <RowSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          title={t("emptyArticles")}
          icon={<FileText className="h-6 w-6" />}
        />
      ) : (
        <ul className="-mx-5 divide-y divide-border">
          {items.map((a) => (
            <li key={a.id}>
              <Link
                href={`/articles/${a.id}`}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
              >
                <StatusBadge status={a.status ?? "draft"} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {getTitle(a)}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <MonoTag>{categoryLabel(a.category)}</MonoTag>
                    <span className="truncate text-[11px] text-muted-foreground">
                      {a.authorName}
                    </span>
                  </div>
                </div>
                <RelativeTime
                  value={a.publishedAt ?? a.updatedAt ?? a.createdAt ?? ""}
                  className="w-12 text-right text-muted-foreground"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function RowSkeleton() {
  return (
    <ul className="-mx-5 divide-y divide-border">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 px-5 py-3">
          <div className="h-4 w-16 shrink-0 animate-pulse rounded-sm bg-muted" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-3.5 w-48 animate-pulse rounded-sm bg-muted" />
            <div className="h-3 w-28 animate-pulse rounded-sm bg-muted/70" />
          </div>
          <div className="h-4 w-10 animate-pulse rounded-sm bg-muted" />
        </li>
      ))}
    </ul>
  );
}
