export interface BankRate {
  bank: string;
  rate: number;
  type: "fixed-5yr" | "govt-program";
}

export const romanianBankRates: BankRate[] = [
  { bank: "Noua Casă", rate: 5.0, type: "govt-program" },
  { bank: "ING Bank", rate: 6.2, type: "fixed-5yr" },
  { bank: "CEC Bank", rate: 6.3, type: "fixed-5yr" },
  { bank: "Banca Transilvania", rate: 6.4, type: "fixed-5yr" },
  { bank: "BRD", rate: 6.5, type: "fixed-5yr" },
  { bank: "Raiffeisen", rate: 6.6, type: "fixed-5yr" },
  { bank: "BCR", rate: 6.8, type: "fixed-5yr" },
];
