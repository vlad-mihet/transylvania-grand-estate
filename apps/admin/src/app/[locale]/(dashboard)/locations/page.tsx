"use client";

import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/shared/page-header";
import { useLocationsOverview } from "@/lib/locations/use-locations-overview";

import { BrandVisibilitySummaryCard } from "./_components/brand-visibility-summary-card";
import { LocationsKpiStrip } from "./_components/locations-kpi-strip";
import { LocationsQuickActions } from "./_components/quick-actions";

export default function LocationsHomePage() {
  const t = useTranslations("Locations.home");
  const data = useLocationsOverview();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={<LocationsQuickActions />}
      />

      <LocationsKpiStrip data={data} />

      <BrandVisibilitySummaryCard data={data} />
    </div>
  );
}
