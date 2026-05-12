"use client";

import { useTranslations } from "next-intl";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button, Skeleton } from "@tge/ui";

import { Link } from "@/i18n/navigation";
import { Can } from "@/components/shared/can";
import { Mono } from "@/components/shared/mono";
import { SectionCard } from "@/components/shared/section-card";
import type { LocationsOverview } from "@/lib/locations/use-locations-overview";

interface BrandRowProps {
  brand: string;
  count: number | undefined;
  isLoading: boolean;
  emptyLabel: string;
}

function BrandRow({ brand, count, isLoading, emptyLabel }: BrandRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Sparkles className="h-3.5 w-3.5 text-copper" />
        {brand}
      </span>
      {isLoading ? (
        <Skeleton className="h-4 w-12" />
      ) : count === 0 ? (
        <span className="mono text-[11px] text-muted-foreground">
          {emptyLabel}
        </span>
      ) : (
        <Mono className="text-sm font-semibold tabular-nums text-foreground">
          {count}
        </Mono>
      )}
    </div>
  );
}

interface Props {
  data: LocationsOverview;
}

/**
 * Side panel that breaks the brand-visibility KPI down per brand. Hidden
 * when the caller lacks `site-config.read` (the KPI tile is hidden too,
 * so this would just render an empty card). The "Edit brand visibility"
 * action lives here and gates on `site-config.update` (SUPER_ADMIN only).
 */
export function BrandVisibilitySummaryCard({ data }: Props) {
  const t = useTranslations("Locations.home.brandVisibility");

  // Mirrors the gate on the KPI tile — both surfaces show / hide
  // together so the layout stays balanced for ADMIN/EDITOR roles that
  // don't carry site-config.read.
  if (data.tgeCuratedCount === null) return null;

  return (
    <SectionCard
      title={t("title")}
      description={t("description")}
      headerActions={
        <Can action="site-config.update">
          <Button asChild variant="ghost" size="sm">
            <Link href="/brand-visibility">
              {t("editAction")}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </Can>
      }
    >
      <div className="divide-y divide-border">
        <BrandRow
          brand={t("brandTge")}
          count={data.tgeCuratedCount}
          isLoading={data.isLoading}
          emptyLabel={t("emptyRow")}
        />
        <BrandRow
          brand={t("brandRevery")}
          count={data.reveryCuratedCount ?? undefined}
          isLoading={data.isLoading}
          emptyLabel={t("emptyRow")}
        />
      </div>
    </SectionCard>
  );
}
