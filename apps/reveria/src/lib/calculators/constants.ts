// Shared numeric primitives used across every calculator.

export const MONTHS_PER_YEAR = 12;

// Fixed EUR→RON conversion rate (approximate, 2025/2026)
export const EUR_TO_RON = 4.97;

// Romanian BNR regulation 17/2012: max 40% of net income for all debts
export const MAX_DTI_RATIO = 0.4;
export const DEFAULT_DOWN_PAYMENT_PCT = 0.2; // 20% down payment
// Simplified BNR subsistence minimum per dependent (~250 EUR/month)
export const SUBSISTENCE_PER_DEPENDENT = 250;

// Noua Casa program limits
export const NOUA_CASA_MAX_PRICE = 70_000; // EUR
export const NOUA_CASA_DOWN_NEW = 0.05; // 5% for new builds
export const NOUA_CASA_DOWN_EXISTING = 0.15; // 15% for existing properties

// Price bounds come from the brand catalogue in @tge/branding so the limits
// stay in sync with the tier scope the API enforces. Inputs outside these
// bounds almost always indicate a typo rather than a legitimate listing.
import { getBrand } from "@tge/branding";

const { priceRange } = getBrand();
export const PRICE_MIN_EUR = priceRange.min;
export const PRICE_MAX_EUR = priceRange.max;
