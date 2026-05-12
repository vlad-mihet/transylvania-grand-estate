"use client";

import { useTranslations } from "next-intl";
import { Building2, HardHat, MessageSquareQuote, Star } from "lucide-react";

import { StatTile } from "@/components/dashboard/stat-tile";
import { Can } from "@/components/shared/can";
import type { AdminCatalogOverview } from "@tge/types";

interface Props {
  data: AdminCatalogOverview | undefined;
  isLoading: boolean;
}

/**
 * Reuses the existing `<StatTile>` primitive but bypasses its built-in
 * fetcher: the Catalog overview endpoint already returns counts in the
 * parent hook, so we feed `value` directly. StatTile gracefully handles
 * the no-endpoint path by skipping the query.
 */
export function CatalogKpiStrip({ data, isLoading }: Props) {
  const t = useTranslations("Catalog.home.kpi");

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Can action="property.read">
        <StatTile
          label={t("properties")}
          icon={Building2}
          href="/properties"
          value={data?.properties.total}
          isLoading={isLoading}
          subLine={
            data
              ? t("propertiesSub", { count: data.properties.available })
              : null
          }
        />
      </Can>
      <Can action="property.read">
        <StatTile
          label={t("featured")}
          icon={Star}
          href="/properties?featured=true"
          value={data?.properties.featured}
          isLoading={isLoading}
        />
      </Can>
      <Can action="developer.read">
        <StatTile
          label={t("developers")}
          icon={HardHat}
          href="/developers"
          value={data?.developers.total}
          isLoading={isLoading}
          subLine={
            data
              ? t("developersSub", { count: data.developers.featured })
              : null
          }
        />
      </Can>
      <Can action="testimonial.read">
        <StatTile
          label={t("testimonials")}
          icon={MessageSquareQuote}
          href="/testimonials"
          value={data?.testimonials.total}
          isLoading={isLoading}
          subLine={
            data && data.testimonials.avgRating !== null
              ? t("testimonialsSub", {
                  rating: data.testimonials.avgRating.toFixed(1),
                })
              : null
          }
        />
      </Can>
    </div>
  );
}
