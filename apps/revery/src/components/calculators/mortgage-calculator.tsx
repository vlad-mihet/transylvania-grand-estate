"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  Input,
  Label,
  Badge,
  Slider,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
} from "@tge/ui";
import { cn } from "@tge/utils";
import { Banknote, TrendingDown, Wallet, Percent } from "lucide-react";
import {
  calculateMortgage,
  romanianBankRates,
  getYearlySummary,
  formatEur,
  formatPercent,
  type BankRate,
} from "@/lib/calculator-utils";
import { CalculatorResultCard } from "./calculator-result-card";

interface MortgageCalculatorProps {
  bankRates?: BankRate[];
  lastUpdated?: string | null;
}

export function MortgageCalculator({ bankRates: propBankRates }: MortgageCalculatorProps) {
  const t = useTranslations("ToolsPage.mortgage");
  const tCommon = useTranslations("ToolsPage");

  const bankRates =
    propBankRates && propBankRates.length > 0
      ? propBankRates
      : romanianBankRates;
  const defaultBank = bankRates[0] ?? null;

  const [propertyPrice, setPropertyPrice] = useState(120000);
  const [downPaymentPct, setDownPaymentPct] = useState(20);
  const [loanTermYears, setLoanTermYears] = useState(25);
  const [interestRate, setInterestRate] = useState(defaultBank?.rate ?? 6.4);
  const [selectedBank, setSelectedBank] = useState<string | null>(
    defaultBank?.bank ?? null,
  );
  const [showFullSchedule, setShowFullSchedule] = useState(false);

  const loanAmount = useMemo(
    () => propertyPrice * (1 - downPaymentPct / 100),
    [propertyPrice, downPaymentPct],
  );

  const result = useMemo(
    () => calculateMortgage(loanAmount, interestRate, loanTermYears),
    [loanAmount, interestRate, loanTermYears],
  );

  const yearlySummary = useMemo(
    () => getYearlySummary(result.amortizationSchedule),
    [result.amortizationSchedule],
  );

  const displayedYears = showFullSchedule
    ? yearlySummary
    : yearlySummary.slice(0, 5);

  function handleBankSelect(bank: string, rate: number) {
    setSelectedBank(bank);
    setInterestRate(rate);
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-8">
        {/* Inputs */}
        <Card className="p-5 md:p-6 md:col-span-3 space-y-6">
          {/* Property Price */}
          <div className="space-y-2">
            <Label htmlFor="propertyPrice">{t("propertyPrice")}</Label>
            <div className="relative">
              <Input
                id="propertyPrice"
                type="number"
                min={10000}
                max={999999}
                value={propertyPrice}
                onChange={(e) =>
                  setPropertyPrice(Number(e.target.value) || 10000)
                }
                className="pl-8 h-11"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                €
              </span>
            </div>
          </div>

          {/* Down Payment */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t("downPayment")}</Label>
              <span className="text-sm font-medium text-primary">
                {downPaymentPct}% — {formatEur(propertyPrice * (downPaymentPct / 100))}
              </span>
            </div>
            <Slider
              value={[downPaymentPct]}
              onValueChange={([v]) => {
                setDownPaymentPct(v);
              }}
              min={5}
              max={80}
              step={5}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>5%</span>
              <span>80%</span>
            </div>
          </div>

          {/* Loan Term */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t("loanTerm")}</Label>
              <span className="text-sm font-medium text-primary">
                {loanTermYears} {t("years")}
              </span>
            </div>
            <Slider
              value={[loanTermYears]}
              onValueChange={([v]) => {
                setLoanTermYears(v);
              }}
              min={5}
              max={30}
              step={1}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>5</span>
              <span>30</span>
            </div>
          </div>

          {/* Interest Rate */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t("interestRate")}</Label>
              <span className="text-sm font-medium text-primary">
                {formatPercent(interestRate)}
              </span>
            </div>
            <Slider
              value={[interestRate * 10]}
              onValueChange={([v]) => {
                setInterestRate(v / 10);
                setSelectedBank(null);
              }}
              min={30}
              max={120}
              step={1}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>3%</span>
              <span>12%</span>
            </div>
          </div>

          {/* Bank Presets */}
          <div className="space-y-2">
            <Label>{t("bankPresets")}</Label>
            <div className="flex flex-wrap gap-2">
              {bankRates.map((bank) => (
                <Badge
                  key={bank.bank}
                  variant={selectedBank === bank.bank ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-colors text-xs py-1.5 px-3",
                    selectedBank === bank.bank
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground",
                    bank.type === "govt-program" &&
                      selectedBank !== bank.bank &&
                      "border-emerald-500/50 text-emerald-700",
                  )}
                  onClick={() => handleBankSelect(bank.bank, bank.rate)}
                >
                  {bank.bank} — {formatPercent(bank.rate)}
                </Badge>
              ))}
            </div>
          </div>

          {/* Loan Amount Display */}
          <div className="rounded-lg bg-muted/50 p-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t("loanAmount")}
            </span>
            <span className="text-sm font-semibold">{formatEur(loanAmount)}</span>
          </div>
        </Card>

        {/* Results */}
        <div className="md:col-span-2 space-y-4">
          <CalculatorResultCard
            label={t("monthlyPayment")}
            value={formatEur(result.monthlyPayment)}
            variant="highlight"
            icon={Banknote}
          />
          <CalculatorResultCard
            label={t("totalInterest")}
            value={formatEur(result.totalInterest)}
            variant="warning"
            icon={TrendingDown}
          />
          <CalculatorResultCard
            label={t("totalPaid")}
            value={formatEur(result.totalPaid)}
            icon={Wallet}
          />
          <CalculatorResultCard
            label={t("ltvRatio")}
            value={formatPercent(100 - downPaymentPct)}
            variant={
              100 - downPaymentPct > 80
                ? "danger"
                : 100 - downPaymentPct > 60
                  ? "warning"
                  : "success"
            }
            icon={Percent}
          />
        </div>
      </div>

      {/* Amortization Chart */}
      {yearlySummary.length > 0 && (
        <Card className="p-5 md:p-6 space-y-4">
          <h3 className="text-lg font-semibold">{t("principalVsInterest")}</h3>
          <div className="space-y-2">
            {displayedYears.map((year) => {
              const total = year.totalPrincipal + year.totalInterest;
              const principalPct = (year.totalPrincipal / total) * 100;
              return (
                <div key={year.year} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-8 shrink-0 text-right">
                    {year.year}
                  </span>
                  <div className="flex-1 h-6 rounded-full overflow-hidden bg-muted flex">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${principalPct}%` }}
                    />
                    <div
                      className="h-full bg-amber-400 transition-all"
                      style={{ width: `${100 - principalPct}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-20 shrink-0 text-right">
                    {formatEur(year.endBalance)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-primary" />
              {t("principalLabel")}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              {t("interestLabel")}
            </div>
          </div>
        </Card>
      )}

      {/* Amortization Table */}
      {yearlySummary.length > 0 && (
        <Card className="p-5 md:p-6 space-y-4">
          <h3 className="text-lg font-semibold">{t("amortization")}</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">{t("year")}</TableHead>
                  <TableHead className="text-right">
                    {t("principalLabel")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("interestLabel")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("balanceLabel")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedYears.map((year) => (
                  <TableRow key={year.year}>
                    <TableCell className="font-medium">{year.year}</TableCell>
                    <TableCell className="text-right">
                      {formatEur(year.totalPrincipal)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatEur(year.totalInterest)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatEur(year.endBalance)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {yearlySummary.length > 5 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFullSchedule(!showFullSchedule)}
              className="w-full"
            >
              {showFullSchedule
                ? t("hideFullSchedule")
                : t("showFullSchedule")}
            </Button>
          )}
        </Card>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground text-center max-w-2xl mx-auto">
        {tCommon("disclaimer")}
      </p>
    </div>
  );
}
