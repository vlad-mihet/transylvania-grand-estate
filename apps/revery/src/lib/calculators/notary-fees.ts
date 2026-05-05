/**
 * Romanian notary fee brackets (2024/2025 schedule). Input and output are in
 * RON — callers using EUR prices should convert first via `EUR_TO_RON`.
 */
export function calculateNotaryFeeRon(priceRon: number): number {
  if (priceRon <= 15_000) {
    return 110 + priceRon * 0.022;
  }
  if (priceRon <= 60_000) {
    return 440 + (priceRon - 15_000) * 0.0072;
  }
  if (priceRon <= 600_000) {
    return 764 + (priceRon - 60_000) * 0.0018;
  }
  return 1_734 + (priceRon - 600_000) * 0.0002;
}
