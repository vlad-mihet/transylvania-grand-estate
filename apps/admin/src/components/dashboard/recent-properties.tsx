"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import type { ApiProperty } from "@tge/types";
import { formatPrice } from "@tge/utils";

import { Link } from "@/i18n/navigation";
import { apiClient } from "@/lib/api-client";
import { usePermissions } from "@/components/auth/auth-provider";
import { EmptyState, ErrorState } from "@tge/ui";
import { Mono } from "@/components/shared/mono";
import { RelativeTime } from "@/components/shared/relative-time";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";

export function RecentProperties() {
  const t = useTranslations("Dashboard");
  const tc = useTranslations("Common");
  const locale = useLocale();
  const { can } = usePermissions();
  const enabled = can("property.read");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard-recent-properties"],
    queryFn: () => apiClient<ApiProperty[]>("/properties?limit=5&sort=newest"),
    enabled,
    staleTime: 30_000,
  });

  if (!enabled) return null;

  const items = Array.isArray(data) ? data : [];

  const getTitle = (p: ApiProperty): string =>
    (p.title as Record<string, string>)[locale] ?? p.title.en ?? p.slug;

  return (
    <SectionCard
      title={t("recentProperties")}
      headerActions={
        <Link
          href="/properties"
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
          title={t("emptyProperties")}
          icon={<Building2 className="h-6 w-6" />}
        />
      ) : (
        <ul className="-mx-5 divide-y divide-border">
          {items.map((p) => {
            const hero =
              p.images?.find((i) => i.isHero) ?? p.images?.[0] ?? null;
            return (
              <li key={p.id}>
                <Link
                  href={`/properties/${p.id}`}
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
                >
                  {hero ? (
                    <div className="relative h-9 w-12 shrink-0 overflow-hidden rounded-sm bg-muted">
                      <Image
                        src={hero.src}
                        alt=""
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-9 w-12 shrink-0 rounded-sm bg-muted" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {getTitle(p)}
                    </p>
                    <Mono className="truncate text-[11px] text-muted-foreground">
                      {p.slug}
                    </Mono>
                  </div>
                  <Mono className="hidden w-24 text-right text-foreground sm:block">
                    {formatPrice(p.price)}
                  </Mono>
                  <StatusBadge status={p.status} />
                  <RelativeTime
                    value={p.updatedAt ?? p.createdAt}
                    className="w-12 text-right text-muted-foreground"
                  />
                </Link>
              </li>
            );
          })}
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
          <div className="h-9 w-12 shrink-0 animate-pulse rounded-sm bg-muted" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-3.5 w-40 animate-pulse rounded-sm bg-muted" />
            <div className="h-3 w-24 animate-pulse rounded-sm bg-muted/70" />
          </div>
          <div className="hidden h-4 w-16 animate-pulse rounded-sm bg-muted sm:block" />
          <div className="h-4 w-14 animate-pulse rounded-sm bg-muted" />
          <div className="h-4 w-10 animate-pulse rounded-sm bg-muted" />
        </li>
      ))}
    </ul>
  );
}
