import {
  DEFAULT_DOWN_PAYMENT_PCT,
  MAX_DTI_RATIO,
  MONTHS_PER_YEAR,
  NOUA_CASA_DOWN_EXISTING,
  NOUA_CASA_DOWN_NEW,
  NOUA_CASA_MAX_PRICE,
  SUBSISTENCE_PER_DEPENDENT,
} from "./constants";

export interface BorrowingCapacityOptions {
  monthlyNetIncome: number;
  existingMonthlyDebts: number;
  annualRate: number;
  termYears: number;
  downPaymentPct?: number;
  dependents?: number;
  includeInsurance?: boolean;
  insuranceRatePct?: number; // monthly % of outstanding balance (e.g. 0.05)
  propertyInsuranceAnnual?: number; // EUR/year
  isNouaCasa?: boolean;
  nouaCasaNewBuild?: boolean;
}

export interface BorrowingCapacityResult {
  maxMonthlyPayment: number;
  maxLoanAmount: number;
  maxPropertyPrice: number;
  dtiRatio: number;
  availableForMortgage: number;
  estimatedInsuranceCost: number;
  propertyInsuranceMonthly: number;
  totalMonthlyCost: number;
  nouaCasaEligible: boolean;
  warnings: string[];
}

export function calculateBorrowingCapacity(
  monthlyNetIncome: number,
  existingMonthlyDebts: number,
  annualRate: number,
  termYears: number,
): BorrowingCapacityResult;
export function calculateBorrowingCapacity(
  opts: BorrowingCapacityOptions,
): BorrowingCapacityResult;
export function calculateBorrowingCapacity(
  incomeOrOpts: number | BorrowingCapacityOptions,
  existingMonthlyDebts?: number,
  annualRate?: number,
  termYears?: number,
): BorrowingCapacityResult {
  const opts: BorrowingCapacityOptions =
    typeof incomeOrOpts === "number"
      ? {
          monthlyNetIncome: incomeOrOpts,
          existingMonthlyDebts: existingMonthlyDebts!,
          annualRate: annualRate!,
          termYears: termYears!,
        }
      : incomeOrOpts;

  const emptyResult: BorrowingCapacityResult = {
    maxMonthlyPayment: 0,
    maxLoanAmount: 0,
    maxPropertyPrice: 0,
    dtiRatio: 0,
    availableForMortgage: 0,
    estimatedInsuranceCost: 0,
    propertyInsuranceMonthly: 0,
    totalMonthlyCost: 0,
    nouaCasaEligible: true,
    warnings: [],
  };

  if (
    opts.monthlyNetIncome <= 0 ||
    opts.annualRate <= 0 ||
    opts.termYears <= 0
  ) {
    return emptyResult;
  }

  const downPct = opts.downPaymentPct ?? DEFAULT_DOWN_PAYMENT_PCT;
  const dependents = opts.dependents ?? 0;
  const includeInsurance = opts.includeInsurance ?? false;
  const insuranceRatePct = opts.insuranceRatePct ?? 0.05;
  const propInsAnnual = opts.propertyInsuranceAnnual ?? 0;
  const isNouaCasa = opts.isNouaCasa ?? false;
  const nouaCasaNewBuild = opts.nouaCasaNewBuild ?? true;
  const warnings: string[] = [];

  const maxTotalDebt = opts.monthlyNetIncome * MAX_DTI_RATIO;
  const dependentDeduction = dependents * SUBSISTENCE_PER_DEPENDENT;
  const propInsMonthly = propInsAnnual / MONTHS_PER_YEAR;

  let availableForMortgage = Math.max(
    0,
    maxTotalDebt -
      opts.existingMonthlyDebts -
      dependentDeduction -
      propInsMonthly,
  );

  const currentDti =
    opts.monthlyNetIncome > 0
      ? opts.existingMonthlyDebts / opts.monthlyNetIncome
      : 0;

  const monthlyRate = opts.annualRate / 100 / MONTHS_PER_YEAR;
  const totalMonths = opts.termYears * MONTHS_PER_YEAR;
  const factor = Math.pow(1 + monthlyRate, totalMonths);

  function reversePmt(payment: number): number {
    return payment * ((factor - 1) / (monthlyRate * factor));
  }

  let maxLoanAmount: number;
  let estimatedInsuranceCost = 0;

  if (includeInsurance && insuranceRatePct > 0) {
    // Iterative approximation: insurance depends on loan which depends on
    // available DTI — two iterations give a stable estimate.
    let loanEstimate = reversePmt(availableForMortgage);
    for (let i = 0; i < 2; i++) {
      estimatedInsuranceCost = loanEstimate * (insuranceRatePct / 100);
      const adjustedAvailable = Math.max(
        0,
        availableForMortgage - estimatedInsuranceCost,
      );
      loanEstimate = reversePmt(adjustedAvailable);
    }
    maxLoanAmount = loanEstimate;
    availableForMortgage = Math.max(
      0,
      availableForMortgage - estimatedInsuranceCost,
    );
  } else {
    maxLoanAmount = reversePmt(availableForMortgage);
  }

  let effectiveDownPct = downPct;
  if (isNouaCasa) {
    effectiveDownPct = nouaCasaNewBuild
      ? NOUA_CASA_DOWN_NEW
      : NOUA_CASA_DOWN_EXISTING;
  }

  let maxPropertyPrice =
    effectiveDownPct < 1
      ? maxLoanAmount / (1 - effectiveDownPct)
      : maxLoanAmount;

  let nouaCasaEligible = true;
  if (isNouaCasa) {
    if (maxPropertyPrice > NOUA_CASA_MAX_PRICE) {
      warnings.push(`nouaCasaExceeds`);
      maxPropertyPrice = NOUA_CASA_MAX_PRICE;
      maxLoanAmount = maxPropertyPrice * (1 - effectiveDownPct);
    }
    nouaCasaEligible = maxPropertyPrice <= NOUA_CASA_MAX_PRICE;
  }

  const mortgagePayment =
    maxLoanAmount > 0
      ? maxLoanAmount * ((monthlyRate * factor) / (factor - 1))
      : 0;
  const totalMonthlyCost =
    mortgagePayment + estimatedInsuranceCost + propInsMonthly;

  return {
    maxMonthlyPayment: availableForMortgage,
    maxLoanAmount,
    maxPropertyPrice,
    dtiRatio: currentDti,
    availableForMortgage,
    estimatedInsuranceCost,
    propertyInsuranceMonthly: propInsMonthly,
    totalMonthlyCost,
    nouaCasaEligible,
    warnings,
  };
}
