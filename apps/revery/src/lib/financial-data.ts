import { fetchApi } from "@tge/api-client";
import { romanianBankRates, EUR_TO_RON, type BankRate } from "./calculator-utils";

export interface ApiBankRate {
  id: string;
  bankName: string;
  rate: number;
  rateType: string;
  maxLtv: number | null;
  maxTermYears: number | null;
  processingFee: number | null;
  insuranceRate: number | null;
  notes: string | null;
  active: boolean;
  sortOrder: number;
  updatedAt: string;
}

export interface CalculatorConfig {
  bankRates: ApiBankRate[];
  indicators: Record<string, { value: number; fetchedAt: string }>;
}

export interface ResolvedCalculatorConfig {
  bankRates: BankRate[];
  bankRatesFull: ApiBankRate[];
  eurToRon: number;
  ircc: number;
  lastUpdated: string | null;
}

// Fallback data (matches current hardcoded values)
const FALLBACK_CONFIG: ResolvedCalculatorConfig = {
  bankRates: romanianBankRates,
  bankRatesFull: [],
  eurToRon: EUR_TO_RON,
  ircc: 5.86,
  lastUpdated: null,
};

export async function fetchCalculatorConfig(): Promise<ResolvedCalculatorConfig> {
  try {
    const raw = await fetchApi<CalculatorConfig>(
      "/financial-data/calculator-config",
      { revalidate: 300 }, // 5 minutes ISR
    );

    // Map API bank rates to the simplified BankRate interface used by calculators
    const bankRates: BankRate[] = raw.bankRates.map((br) => ({
      bank: br.bankName,
      rate: br.rate,
      type: br.rateType === "govt_program"
        ? ("govt-program" as const)
        : ("fixed-5yr" as const),
    }));

    const eurRon = raw.indicators.EUR_RON?.value ?? EUR_TO_RON;
    const ircc = raw.indicators.IRCC?.value ?? 5.86;

    // Find the most recent fetchedAt across all indicators
    const dates = Object.values(raw.indicators)
      .map((i) => i.fetchedAt)
      .filter(Boolean);
    const lastUpdated =
      dates.length > 0
        ? dates.sort().reverse()[0]
        : null;

    return {
      bankRates,
      bankRatesFull: raw.bankRates,
      eurToRon: eurRon,
      ircc,
      lastUpdated,
    };
  } catch {
    return FALLBACK_CONFIG;
  }
}
