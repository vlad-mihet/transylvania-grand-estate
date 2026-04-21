export type RateType = "fixed" | "variable" | "govt_program";

export interface BankRate {
  id: string;
  bankName: string;
  rate: number;
  rateType: RateType;
  maxLtv: number | null;
  maxTermYears: number | null;
  processingFee: number | null;
  insuranceRate: number | null;
  notes: string | null;
  active: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export const RATE_TYPES: RateType[] = ["fixed", "variable", "govt_program"];
