"use client";

import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/shared/page-header";
import { useCatalogOverview } from "@/lib/catalog/use-catalog-overview";

import { CatalogKpiStrip } from "./_components/catalog-kpi-strip";
import { CatalogQuickActions } from "./_components/quick-actions";
import { RecentPropertiesCard } from "./_components/recent-properties-card";
import { RecentTestimonialsCard } from "./_components/recent-testimonials-card";

export default function CatalogHomePage() {
  const t = useTranslations("Catalog.home");
  const query = useCatalogOverview();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={<CatalogQuickActions />}
      />

      <CatalogKpiStrip data={query.data} isLoading={query.isLoading} />

      <div className="grid gap-5 lg:grid-cols-2">
        <RecentPropertiesCard
          items={query.data?.properties.recent ?? []}
          isLoading={query.isLoading}
        />
        <RecentTestimonialsCard
          items={query.data?.testimonials.recent ?? []}
          isLoading={query.isLoading}
        />
      </div>
    </div>
  );
}
