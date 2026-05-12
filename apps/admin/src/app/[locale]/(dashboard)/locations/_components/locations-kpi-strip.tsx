"use client";

import { useTranslations } from "next-intl";
import { Map, MapPin, Sparkles } from "lucide-react";

import { StatTile } from "@/components/dashboard/stat-tile";
import { Can } from "@/components/shared/can";
import type { LocationsOverview } from "@/lib/locations/use-locations-overview";

interface Props {
  data: LocationsOverview;
}

/**
 * Three KPI tiles: Counties total, Cities total, Brand-curated cities
 * (combined TGE + Revery count). The brand-curated tile uses a sub-line
 * to break the count down per brand; keeps the strip to 3 cards instead
 * of 4, matching the locked plan.
 */
export function LocationsKpiStrip({ data }: Props) {
  const t = useTranslations("Locations.home.kpi");

  // Combined curated count for the brand-visibility tile. Both can be
  // undefined while loading or if site-config.read is denied.
  const combinedCurated =
    data.tgeCuratedCount !== null && data.tgeCuratedCount !== undefined
      ? (data.tgeCuratedCount ?? 0) + (data.reveryCuratedCount ?? 0)
      : undefined;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Can action="county.read">
        <StatTile
          label={t("counties")}
          icon={Map}
          href="/counties"
          value={data.countiesTotal}
          isLoading={data.isLoading}
        />
      </Can>
      <Can action="city.read">
        <StatTile
          label={t("cities")}
          icon={MapPin}
          href="/cities"
          value={data.citiesTotal}
          isLoading={data.isLoading}
        />
      </Can>
      <Can action="site-config.read">
        <StatTile
          label={t("brandCurated")}
          icon={Sparkles}
          href="/brand-visibility"
          value={combinedCurated}
          isLoading={data.isLoading}
          subLine={
            data.tgeCuratedCount !== null &&
            data.tgeCuratedCount !== undefined
              ? t("brandCuratedSub", {
                  tge: data.tgeCuratedCount ?? 0,
                  revery: data.reveryCuratedCount ?? 0,
                })
              : null
          }
        />
      </Can>
    </div>
  );
}
