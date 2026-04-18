import { EUR_TO_RON } from "./constants";
import { calculateNotaryFeeRon } from "./notary-fees";

export interface PurchaseCostResult {
  notaryFee: number;
  landRegistryFee: number;
  agentCommission: number;
  stampDuty: number;
  legalFees: number;
  totalFees: number;
  grandTotal: number;
  feesAsPercent: number;
}

export function calculatePurchaseCosts(
  propertyPriceEur: number,
  agentCommissionPct: number = 2,
  eurToRon: number = EUR_TO_RON,
): PurchaseCostResult {
  if (propertyPriceEur <= 0) {
    return {
      notaryFee: 0,
      landRegistryFee: 0,
      agentCommission: 0,
      stampDuty: 0,
      legalFees: 0,
      totalFees: 0,
      grandTotal: 0,
      feesAsPercent: 0,
    };
  }

  const priceRon = propertyPriceEur * eurToRon;

  // Notary fee (calculated in RON, converted back to EUR)
  const notaryFeeRon = calculateNotaryFeeRon(priceRon);
  const notaryFee = notaryFeeRon / eurToRon;

  // Land registry / intabulare (~0.15% of property value)
  const landRegistryFee = propertyPriceEur * 0.0015;

  // Agent commission
  const agentCommission = propertyPriceEur * (agentCommissionPct / 100);

  // Stamp duty / timbru fiscal (fixed amounts in RON, ~5-100 RON depending on transaction)
  const stampDuty = 50 / eurToRon;

  // Legal fees estimate (€500–€1,500 depending on complexity)
  const legalFees =
    propertyPriceEur < 50_000
      ? 500
      : propertyPriceEur < 200_000
        ? 800
        : propertyPriceEur < 500_000
          ? 1_000
          : 1_500;

  const totalFees =
    notaryFee + landRegistryFee + agentCommission + stampDuty + legalFees;
  const grandTotal = propertyPriceEur + totalFees;
  const feesAsPercent = (totalFees / propertyPriceEur) * 100;

  return {
    notaryFee,
    landRegistryFee,
    agentCommission,
    stampDuty,
    legalFees,
    totalFees,
    grandTotal,
    feesAsPercent,
  };
}
