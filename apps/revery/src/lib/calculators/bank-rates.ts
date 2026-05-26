export interface BankRate {
  bank: string;
  rate: number;
  type: "fixed-5yr" | "govt-program";
}

// 5-year-fixed nominal mortgage rates, researched May 2026 (public bank
// comparators). Offline fallback only — the live values come from the API
// (bank_rates table, editable in admin). Noua Casă is the government program:
// its rate is IRCC + 2pp (≈ 5.58 + 2.0 = 7.58 at the current IRCC).
export const romanianBankRates: BankRate[] = [
  { bank: "Noua Casă", rate: 7.58, type: "govt-program" },
  { bank: "Banca Transilvania", rate: 5.29, type: "fixed-5yr" },
  { bank: "Raiffeisen", rate: 5.9, type: "fixed-5yr" },
  { bank: "ING Bank", rate: 5.95, type: "fixed-5yr" },
  { bank: "CEC Bank", rate: 5.95, type: "fixed-5yr" },
  { bank: "BCR", rate: 5.95, type: "fixed-5yr" },
  { bank: "BRD", rate: 6.3, type: "fixed-5yr" },
];
