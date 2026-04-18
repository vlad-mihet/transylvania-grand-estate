"use client";

import { useTranslations } from "next-intl";
import {
  Card,
  Input,
  Label,
  Badge,
  Slider,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@tge/ui";
import { cn } from "@tge/utils";
import {
  ShieldCheck,
  AlertTriangle,
  Users,
  Shield,
} from "lucide-react";
import { formatPercent } from "@/lib/calculator-utils";
import type { BorrowingCapacityState } from "./use-borrowing-capacity";

interface BorrowingCapacityFormProps {
  state: BorrowingCapacityState;
}

export function BorrowingCapacityForm({ state }: BorrowingCapacityFormProps) {
  const t = useTranslations("ToolsPage.borrowingCapacity");
  const tMortgage = useTranslations("ToolsPage.mortgage");

  const { values, actions } = state;
  const {
    monthlyIncome,
    existingDebts,
    interestRate,
    loanTermYears,
    selectedBank,
    downPaymentPct,
    dependents,
    isNouaCasa,
    nouaCasaNewBuild,
    includeInsurance,
    bankRates,
    lastUpdated,
    effectiveDownPct,
    result,
  } = values;

  return (
    <div className="space-y-6">
      {/* Section 1: Financial Profile */}
      <Card className="p-5 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label htmlFor="monthlyIncome">{t("monthlyIncome")}</Label>
            <div className="relative">
              <Input
                id="monthlyIncome"
                type="number"
                min={500}
                max={100000}
                value={monthlyIncome}
                onChange={(e) =>
                  actions.setMonthlyIncome(Number(e.target.value) || 500)
                }
                className="pl-8 h-11"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                €
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="existingDebts">{t("existingDebts")}</Label>
            <div className="relative">
              <Input
                id="existingDebts"
                type="number"
                min={0}
                max={50000}
                value={existingDebts}
                onChange={(e) =>
                  actions.setExistingDebts(Number(e.target.value) || 0)
                }
                className="pl-8 h-11"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                €
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("existingDebtsInfo")}
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <Label className="text-sm whitespace-nowrap">
              {t("dependents")}
            </Label>
          </div>
          <Select
            value={String(dependents)}
            onValueChange={(v) => actions.setDependents(Number(v))}
          >
            <SelectTrigger className="h-9 w-auto min-w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">{t("dep0")}</SelectItem>
              <SelectItem value="1">{t("dep1")}</SelectItem>
              <SelectItem value="2">{t("dep2")}</SelectItem>
              <SelectItem value="3">{t("dep3")}</SelectItem>
              <SelectItem value="4">{t("dep4")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Section 2: Loan Parameters */}
      <Card className="p-5 md:p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t("downPayment")}</Label>
              <span className="text-sm font-semibold tabular-nums text-primary">
                {effectiveDownPct}%
              </span>
            </div>
            <Slider
              value={[downPaymentPct]}
              onValueChange={([v]) => actions.setDownPaymentPct(v)}
              min={5}
              max={80}
              step={1}
              disabled={isNouaCasa}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground/60">
              <span>5%</span>
              <span>80%</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t("loanTerm")}</Label>
              <span className="text-sm font-semibold tabular-nums text-primary">
                {loanTermYears} {t("years")}
              </span>
            </div>
            <Slider
              value={[loanTermYears]}
              onValueChange={([v]) => actions.setLoanTermYears(v)}
              min={5}
              max={30}
              step={1}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground/60">
              <span>5</span>
              <span>30</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t("interestRate")}</Label>
            <span className="text-sm font-semibold tabular-nums text-primary">
              {formatPercent(interestRate)}
            </span>
          </div>
          <Slider
            value={[interestRate * 10]}
            onValueChange={([v]) => actions.updateInterestRate(v / 10)}
            min={30}
            max={120}
            step={1}
          />
          <div className="flex justify-between text-[11px] text-muted-foreground/60">
            <span>3%</span>
            <span>12%</span>
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <Label className="text-sm">{tMortgage("bankPresets")}</Label>
            {lastUpdated && (
              <span className="text-[11px] text-muted-foreground">
                {t("ratesUpdated", {
                  date: new Date(lastUpdated).toLocaleDateString("ro-RO"),
                })}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {bankRates.map((bank) => (
              <Badge
                key={bank.bank}
                variant={selectedBank === bank.bank ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-all text-xs py-1 px-2.5",
                  selectedBank === bank.bank
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "hover:bg-accent hover:text-accent-foreground",
                  bank.type === "govt-program" &&
                    selectedBank !== bank.bank &&
                    "border-emerald-500/50 text-emerald-700",
                )}
                onClick={() => actions.selectBank(bank.bank, bank.rate)}
              >
                {bank.bank} — {formatPercent(bank.rate)}
              </Badge>
            ))}
          </div>
        </div>
      </Card>

      {/* Section 3: Options toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          className={cn(
            "rounded-xl border p-4 transition-all cursor-pointer",
            isNouaCasa
              ? "border-emerald-400 bg-emerald-50/60 ring-1 ring-emerald-400/30"
              : "border-border hover:border-emerald-300 hover:bg-emerald-50/30",
          )}
          onClick={() => actions.setIsNouaCasa(!isNouaCasa)}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                isNouaCasa
                  ? "bg-emerald-500 text-white"
                  : "bg-emerald-500/10 text-emerald-600",
              )}
            >
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">{t("nouaCasa")}</p>
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                Max 70.000 € ·{" "}
                {isNouaCasa ? (nouaCasaNewBuild ? "5%" : "15%") : "5-15%"} avans
              </p>
            </div>
          </div>
          {isNouaCasa && (
            <div
              className="flex gap-4 mt-3 pt-3 border-t border-emerald-200"
              onClick={(e) => e.stopPropagation()}
            >
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="radio"
                  name="nouaCasaType"
                  checked={nouaCasaNewBuild}
                  onChange={() => actions.setNouaCasaNewBuild(true)}
                  className="text-emerald-600 h-3 w-3"
                />
                {t("nouaCasaNewBuild")}
              </label>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="radio"
                  name="nouaCasaType"
                  checked={!nouaCasaNewBuild}
                  onChange={() => actions.setNouaCasaNewBuild(false)}
                  className="text-emerald-600 h-3 w-3"
                />
                {t("nouaCasaExisting")}
              </label>
            </div>
          )}
        </div>

        <div
          className={cn(
            "rounded-xl border p-4 transition-all cursor-pointer",
            includeInsurance
              ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
              : "border-border hover:border-primary/30 hover:bg-primary/[0.02]",
          )}
          onClick={() => actions.setIncludeInsurance(!includeInsurance)}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                includeInsurance
                  ? "bg-primary text-white"
                  : "bg-primary/10 text-primary",
              )}
            >
              <Shield className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">{t("includeInsurance")}</p>
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                {t("insuranceInfo")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-1.5">
          {result.warnings.map((w, i) => (
            <p
              key={i}
              className="text-sm text-amber-800 flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
              {t(w)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
