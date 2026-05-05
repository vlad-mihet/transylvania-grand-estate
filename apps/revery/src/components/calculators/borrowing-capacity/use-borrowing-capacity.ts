"use client";

import { useCallback, useMemo, useState } from "react";
import {
  calculateBorrowingCapacity,
  romanianBankRates,
  MAX_DTI_RATIO,
  type BankRate,
} from "@/lib/calculator-utils";
import type { ApiBankRate } from "@/lib/financial-data";

export interface UseBorrowingCapacityOptions {
  bankRates?: BankRate[];
  bankRatesFull?: ApiBankRate[];
  lastUpdated?: string | null;
}

/**
 * All state + derived values for the borrowing-capacity calculator. JSX lives
 * in `borrowing-capacity-form`, `dti-visualization`, and `borrowing-capacity-results`
 * — this hook is the single source of truth for the numbers.
 */
export function useBorrowingCapacity(options: UseBorrowingCapacityOptions) {
  const { bankRates: propBankRates, bankRatesFull, lastUpdated } = options;

  const bankRates =
    propBankRates && propBankRates.length > 0
      ? propBankRates
      : romanianBankRates;
  const defaultBank = bankRates[0] ?? null;

  const [monthlyIncome, setMonthlyIncome] = useState(3000);
  const [existingDebts, setExistingDebts] = useState(200);
  const [interestRate, setInterestRate] = useState(defaultBank?.rate ?? 6.4);
  const [loanTermYears, setLoanTermYears] = useState(25);
  const [selectedBank, setSelectedBank] = useState<string | null>(
    defaultBank?.bank ?? null,
  );
  const [downPaymentPct, setDownPaymentPct] = useState(20);
  const [dependents, setDependents] = useState(0);
  const [isNouaCasa, setIsNouaCasa] = useState(false);
  const [nouaCasaNewBuild, setNouaCasaNewBuild] = useState(true);
  const [includeInsurance, setIncludeInsurance] = useState(false);

  const selectedBankFull = bankRatesFull?.find(
    (b) => b.bankName === selectedBank,
  );
  const insuranceRatePct = selectedBankFull?.insuranceRate ?? 0.05;

  const result = useMemo(
    () =>
      calculateBorrowingCapacity({
        monthlyNetIncome: monthlyIncome,
        existingMonthlyDebts: existingDebts,
        annualRate: interestRate,
        termYears: loanTermYears,
        downPaymentPct: isNouaCasa ? undefined : downPaymentPct / 100,
        dependents,
        includeInsurance,
        insuranceRatePct,
        propertyInsuranceAnnual: 0,
        isNouaCasa,
        nouaCasaNewBuild,
      }),
    [
      monthlyIncome,
      existingDebts,
      interestRate,
      loanTermYears,
      downPaymentPct,
      dependents,
      includeInsurance,
      insuranceRatePct,
      isNouaCasa,
      nouaCasaNewBuild,
    ],
  );

  const maxAllowedDebt = monthlyIncome * MAX_DTI_RATIO;
  const debtUsedPct =
    maxAllowedDebt > 0 ? (existingDebts / maxAllowedDebt) * 100 : 0;
  const availablePct =
    maxAllowedDebt > 0
      ? (result.availableForMortgage / maxAllowedDebt) * 100
      : 0;

  const effectiveDownPct = isNouaCasa
    ? nouaCasaNewBuild
      ? 5
      : 15
    : downPaymentPct;

  const selectBank = useCallback((bank: string, rate: number) => {
    setSelectedBank(bank);
    setInterestRate(rate);
  }, []);

  const updateInterestRate = useCallback((rate: number) => {
    setInterestRate(rate);
    setSelectedBank(null);
  }, []);

  return {
    values: {
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
      result,
      maxAllowedDebt,
      debtUsedPct,
      availablePct,
      effectiveDownPct,
      insuranceRatePct,
    },
    actions: {
      setMonthlyIncome,
      setExistingDebts,
      setLoanTermYears,
      setDownPaymentPct,
      setDependents,
      setIsNouaCasa,
      setNouaCasaNewBuild,
      setIncludeInsurance,
      selectBank,
      updateInterestRate,
    },
  };
}

export type BorrowingCapacityState = ReturnType<typeof useBorrowingCapacity>;
