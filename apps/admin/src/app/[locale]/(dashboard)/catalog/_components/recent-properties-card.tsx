"use client";

import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Building2 } from "lucide-react";
import { Button } from "@tge/ui";

import { Link } from "@/i18n/navigation";
import { RecentList } from "@/components/shared/recent-list";
import { SectionCard } from "@/components/shared/section-card";
import type { RecentPropertyEntry } from "@tge/types";

interface Props {
  items: RecentPropertyEntry[];
  isLoading: boolean;
}

function pickTitle(
  title: Record<string, string | undefined>,
  slug: string,
  locale: string,
): string {
  return title[locale] ?? title.en ?? title.ro ?? slug;
}

export function RecentPropertiesCard({ items, isLoading }: Props) {
  const t = useTranslations("Catalog.home.recent");
  const locale = useLocale();

  return (
    <SectionCard
      title={t("propertiesTitle")}
      headerActions={
        <Button asChild variant="ghost" size="sm">
          <Link href="/properties">
            {t("viewAll")}
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      }
    >
      <RecentList
        items={items.map((p) => ({
          id: p.id,
          href: `/properties/${p.id}/edit`,
          title: pickTitle(p.title, p.slug, locale),
          status: p.status,
          badges: p.featured ? (
            <span
              className="mono inline-flex items-center gap-1 rounded-sm border border-border bg-copper/10 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.06em] text-copper"
              aria-label="featured"
            >
              <Building2 className="h-3 w-3" />
              ★
            </span>
          ) : undefined,
          timestamp: p.updatedAt,
        }))}
        loading={isLoading}
        emptyLabel={t("empty")}
      />
    </SectionCard>
  );
}
