"use client";

import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api-client";
import { usePermissions } from "@/components/auth/auth-provider";

interface BankRateRow {
  id: string;
  active: boolean;
  updatedAt: string;
}

interface FinancialIndicatorRow {
  id: string;
  key: string; // "EUR_RON" | "IRCC"
  value: number;
  source: string;
  fetchedAt: string;
}

export interface FinanceOverview {
  activeBankRatesCount: number;
  /** ISO timestamp of the oldest active bank-rate update; null when no
   * active rates. Used for the "freshness" subline on the count tile. */
  oldestActiveBankRateAt: string | null;
  eurRon: FinancialIndicatorRow | null;
  ircc: FinancialIndicatorRow | null;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Composes the Finance module home from existing public endpoints.
 * Per the locked plan's "mixed" API strategy, Finance does NOT get its
 * own aggregator: the two existing endpoints already shipped (and one
 * is already cached by the bank-rates list page via React Query),
 * so client-side composition is cheaper than a new server module.
 *
 * Returns derived signals (active count, oldest update timestamp,
 * keyed indicators) so the consumer doesn't have to know about the
 * underlying array shapes.
 */
export function useFinanceOverview(): FinanceOverview {
  const { can } = usePermissions();
  const canBankRates = can("bank-rate.read");
  const canIndicators = can("financial-indicator.read");

  // `?all=true` returns inactive rows too — we filter client-side. The
  // bank-rates list page uses the same query key + endpoint so React
  // Query dedupes if the list page is open in the same session.
  const bankRatesQuery = useQuery({
    queryKey: ["bank-rates", { all: true }],
    queryFn: () =>
      apiClient<BankRateRow[]>("/financial-data/bank-rates?all=true"),
    enabled: canBankRates,
    staleTime: 60_000,
  });

  const indicatorsQuery = useQuery({
    queryKey: ["financial-indicators"],
    queryFn: () =>
      apiClient<FinancialIndicatorRow[]>("/financial-data/indicators"),
    enabled: canIndicators,
    staleTime: 60_000,
  });

  const allBankRates = Array.isArray(bankRatesQuery.data)
    ? bankRatesQuery.data
    : [];
  const activeBankRates = allBankRates.filter((r) => r.active);
  const oldestActive =
    activeBankRates.length > 0
      ? activeBankRates.reduce(
          (acc, r) => (r.updatedAt < acc ? r.updatedAt : acc),
          activeBankRates[0]!.updatedAt,
        )
      : null;

  const indicators = Array.isArray(indicatorsQuery.data)
    ? indicatorsQuery.data
    : [];
  const eurRon = indicators.find((i) => i.key === "EUR_RON") ?? null;
  const ircc = indicators.find((i) => i.key === "IRCC") ?? null;

  return {
    activeBankRatesCount: activeBankRates.length,
    oldestActiveBankRateAt: oldestActive,
    eurRon,
    ircc,
    isLoading:
      (canBankRates && bankRatesQuery.isLoading) ||
      (canIndicators && indicatorsQuery.isLoading),
    isError:
      (canBankRates && bankRatesQuery.isError) ||
      (canIndicators && indicatorsQuery.isError),
  };
}
