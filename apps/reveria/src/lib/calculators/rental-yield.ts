import { MONTHS_PER_YEAR } from "./constants";

export interface RentalYieldResult {
  grossYield: number;
  netYield: number;
  monthlyCashFlow: number;
  annualCashFlow: number;
  paybackYears: number;
}

export function calculateRentalYield(
  purchasePrice: number,
  monthlyRent: number,
  annualExpenses: number,
): RentalYieldResult {
  if (purchasePrice <= 0 || monthlyRent <= 0) {
    return {
      grossYield: 0,
      netYield: 0,
      monthlyCashFlow: 0,
      annualCashFlow: 0,
      paybackYears: 0,
    };
  }

  const annualRent = monthlyRent * MONTHS_PER_YEAR;
  const grossYield = (annualRent / purchasePrice) * 100;
  const netIncome = annualRent - annualExpenses;
  const netYield = (netIncome / purchasePrice) * 100;
  const monthlyCashFlow = netIncome / MONTHS_PER_YEAR;
  const paybackYears = netIncome > 0 ? purchasePrice / netIncome : 0;

  return {
    grossYield,
    netYield,
    monthlyCashFlow,
    annualCashFlow: netIncome,
    paybackYears,
  };
}
