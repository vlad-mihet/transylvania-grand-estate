"use client";

import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/shared/page-header";
import { useFinanceOverview } from "@/lib/finance/use-finance-overview";

import { FinanceKpiStrip } from "./_components/finance-kpi-strip";
import { FinanceQuickActions } from "./_components/quick-actions";

export default function FinanceHomePage() {
  const t = useTranslations("Finance.home");
  const data = useFinanceOverview();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={<FinanceQuickActions />}
      />

      <FinanceKpiStrip data={data} />
    </div>
  );
}
