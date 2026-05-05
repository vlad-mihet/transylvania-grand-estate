"use client";

import { useTranslations } from "next-intl";
import {
  Banknote,
  Building2,
  Wallet,
  BarChart3,
  CreditCard,
} from "lucide-react";
import { formatEur, formatPercent } from "@/lib/calculator-utils";
import { CalculatorResultCard } from "../calculator-result-card";
import type { BorrowingCapacityState } from "./use-borrowing-capacity";

interface BorrowingCapacityResultsProps {
  state: BorrowingCapacityState;
}

export function BorrowingCapacityResults({
  state,
}: BorrowingCapacityResultsProps) {
  const t = useTranslations("ToolsPage.borrowingCapacity");
  const { result, effectiveDownPct, includeInsurance } = state.values;

  return (
    <div className="lg:sticky lg:top-24 space-y-4">
      <CalculatorResultCard
        label={t("maxMonthlyPayment")}
        value={formatEur(result.maxMonthlyPayment)}
        variant="highlight"
        icon={Banknote}
      />
      <CalculatorResultCard
        label={t("maxLoan")}
        value={formatEur(result.maxLoanAmount)}
        icon={Wallet}
      />
      <CalculatorResultCard
        label={t("maxProperty")}
        value={formatEur(result.maxPropertyPrice)}
        subtitle={t("maxPropertyInfo", { pct: effectiveDownPct })}
        variant="success"
        icon={Building2}
      />
      {includeInsurance && result.totalMonthlyCost > 0 && (
        <CalculatorResultCard
          label={t("totalMonthlyCost")}
          value={formatEur(result.totalMonthlyCost)}
          subtitle={t("totalMonthlyCostInfo")}
          icon={CreditCard}
        />
      )}
      <CalculatorResultCard
        label={t("dtiRatio")}
        value={formatPercent(result.dtiRatio * 100)}
        variant={
          result.dtiRatio > 0.35
            ? "danger"
            : result.dtiRatio > 0.2
              ? "warning"
              : "success"
        }
        icon={BarChart3}
      />
    </div>
  );
}
