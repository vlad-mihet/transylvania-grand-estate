"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, Input, Label } from "@tge/ui";
import {
  TrendingUp,
  TrendingDown,
  Banknote,
  Clock,
} from "lucide-react";
import {
  calculateRentalYield,
  formatEur,
  formatPercent,
  formatYears,
} from "@/lib/calculator-utils";
import { CalculatorResultCard } from "./calculator-result-card";

function getYieldVariant(
  yield_: number,
): "success" | "warning" | "danger" | "default" {
  if (yield_ >= 7) return "success";
  if (yield_ >= 5) return "success";
  if (yield_ >= 3) return "warning";
  return "danger";
}

function getYieldLabel(
  yield_: number,
  t: (key: string) => string,
): string {
  if (yield_ >= 7) return t("yieldExcellent");
  if (yield_ >= 5) return t("yieldGood");
  if (yield_ >= 3) return t("yieldModerate");
  return t("yieldLow");
}

export function RentalYieldCalculator() {
  const t = useTranslations("ToolsPage.rentalYield");
  const tCommon = useTranslations("ToolsPage");

  const [purchasePrice, setPurchasePrice] = useState(120000);
  const [monthlyRent, setMonthlyRent] = useState(500);
  const [annualExpenses, setAnnualExpenses] = useState(1200);

  const result = useMemo(
    () => calculateRentalYield(purchasePrice, monthlyRent, annualExpenses),
    [purchasePrice, monthlyRent, annualExpenses],
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {/* Inputs */}
        <Card className="p-5 md:p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="purchasePrice">{t("purchasePrice")}</Label>
            <div className="relative">
              <Input
                id="purchasePrice"
                type="number"
                min={10000}
                max={999999}
                value={purchasePrice}
                onChange={(e) =>
                  setPurchasePrice(Number(e.target.value) || 10000)
                }
                className="pl-8 h-11"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                €
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthlyRent">{t("monthlyRent")}</Label>
            <div className="relative">
              <Input
                id="monthlyRent"
                type="number"
                min={0}
                max={50000}
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(Number(e.target.value) || 0)}
                className="pl-8 h-11"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                €
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="annualExpenses">{t("annualExpenses")}</Label>
            <div className="relative">
              <Input
                id="annualExpenses"
                type="number"
                min={0}
                max={100000}
                value={annualExpenses}
                onChange={(e) =>
                  setAnnualExpenses(Number(e.target.value) || 0)
                }
                className="pl-8 h-11"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                €
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("annualExpensesInfo")}
            </p>
          </div>
        </Card>

        {/* Results */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CalculatorResultCard
            label={t("grossYield")}
            value={formatPercent(result.grossYield)}
            subtitle={getYieldLabel(result.grossYield, t)}
            variant={getYieldVariant(result.grossYield)}
            icon={TrendingUp}
          />
          <CalculatorResultCard
            label={t("netYield")}
            value={formatPercent(result.netYield)}
            subtitle={getYieldLabel(result.netYield, t)}
            variant={getYieldVariant(result.netYield)}
            icon={TrendingDown}
          />
          <CalculatorResultCard
            label={t("monthlyCashFlow")}
            value={formatEur(result.monthlyCashFlow)}
            subtitle={`${t("annualCashFlow")}: ${formatEur(result.annualCashFlow)}`}
            variant={result.monthlyCashFlow >= 0 ? "success" : "danger"}
            icon={Banknote}
          />
          <CalculatorResultCard
            label={t("paybackPeriod")}
            value={
              result.paybackYears > 0
                ? t("paybackYears", { years: formatYears(result.paybackYears) })
                : "—"
            }
            variant={
              result.paybackYears > 0 && result.paybackYears <= 15
                ? "success"
                : result.paybackYears <= 25
                  ? "warning"
                  : "danger"
            }
            icon={Clock}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center max-w-2xl mx-auto">
        {tCommon("disclaimer")}
      </p>
    </div>
  );
}
