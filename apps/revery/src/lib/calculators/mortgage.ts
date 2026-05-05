import { MONTHS_PER_YEAR } from "./constants";

export interface AmortizationEntry {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface MortgageResult {
  monthlyPayment: number;
  totalInterest: number;
  totalPaid: number;
  loanAmount: number;
  amortizationSchedule: AmortizationEntry[];
}

export function calculateMortgage(
  principal: number,
  annualRate: number,
  termYears: number,
): MortgageResult {
  if (principal <= 0 || annualRate < 0 || termYears <= 0) {
    return {
      monthlyPayment: 0,
      totalInterest: 0,
      totalPaid: 0,
      loanAmount: principal,
      amortizationSchedule: [],
    };
  }

  const totalMonths = termYears * MONTHS_PER_YEAR;

  // 0% promotional rate is a valid input — the standard amortization formula
  // divides by (factor - 1) which is 0 here. Fall back to straight-line
  // principal distribution.
  if (annualRate === 0) {
    const monthlyPayment = principal / totalMonths;
    const schedule: AmortizationEntry[] = [];
    let balance = principal;
    for (let month = 1; month <= totalMonths; month++) {
      balance = Math.max(0, balance - monthlyPayment);
      schedule.push({
        month,
        payment: monthlyPayment,
        principal: monthlyPayment,
        interest: 0,
        balance,
      });
    }
    return {
      monthlyPayment,
      totalInterest: 0,
      totalPaid: monthlyPayment * totalMonths,
      loanAmount: principal,
      amortizationSchedule: schedule,
    };
  }

  const monthlyRate = annualRate / 100 / MONTHS_PER_YEAR;
  const factor = Math.pow(1 + monthlyRate, totalMonths);
  const monthlyPayment = (principal * (monthlyRate * factor)) / (factor - 1);

  const schedule: AmortizationEntry[] = [];
  let balance = principal;
  for (let month = 1; month <= totalMonths; month++) {
    const interestPortion = balance * monthlyRate;
    const principalPortion = monthlyPayment - interestPortion;
    balance = Math.max(0, balance - principalPortion);

    schedule.push({
      month,
      payment: monthlyPayment,
      principal: principalPortion,
      interest: interestPortion,
      balance,
    });
  }

  const totalPaid = monthlyPayment * totalMonths;
  const totalInterest = totalPaid - principal;

  return {
    monthlyPayment,
    totalInterest,
    totalPaid,
    loanAmount: principal,
    amortizationSchedule: schedule,
  };
}

export interface YearlySummary {
  year: number;
  totalPrincipal: number;
  totalInterest: number;
  endBalance: number;
}

export function getYearlySummary(
  schedule: AmortizationEntry[],
): YearlySummary[] {
  const years: YearlySummary[] = [];
  const totalYears = schedule.length / MONTHS_PER_YEAR;

  for (let y = 0; y < totalYears; y++) {
    const yearEntries = schedule.slice(
      y * MONTHS_PER_YEAR,
      (y + 1) * MONTHS_PER_YEAR,
    );
    if (yearEntries.length === 0) break;

    years.push({
      year: y + 1,
      totalPrincipal: yearEntries.reduce((s, e) => s + e.principal, 0),
      totalInterest: yearEntries.reduce((s, e) => s + e.interest, 0),
      endBalance: yearEntries[yearEntries.length - 1].balance,
    });
  }

  return years;
}
