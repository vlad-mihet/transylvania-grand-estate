import { Injectable, Logger } from '@nestjs/common';
import { Brand, PropertyTier } from '@prisma/client';
import type { CanonicalListingInput } from '@tge/types';
import { FinancialDataService } from '../../financial-data/financial-data.service';

export interface BrandRouting {
  /** Price normalized to EUR (the platform's storage currency). */
  priceEur: number;
  tier: PropertyTier;
  brand: Brand;
  /** True when price ≥ the luxury threshold — a hint for manual curation. */
  promotionSuggested: boolean;
}

/**
 * Decides tier + brand for an imported listing. Product rule (NOT the
 * adapter's concern):
 *
 *   Imports ALWAYS land in REVERY/Adorys (tier = affordable, brand = revery).
 *   TGE is premium and must not be diluted by auto-import — a listing becomes
 *   luxury/TGE only through a manual promotion step (deferred phase). Price may
 *   *suggest* promotion; a human confirms. So the threshold here only sets a
 *   `promotionSuggested` hint and is logged; it never changes the import target.
 *
 * The stage also normalizes price to EUR (the feed may quote RON) so both the
 * stored price and the suggestion threshold are apples-to-apples.
 */
@Injectable()
export class BrandRouteService {
  private readonly logger = new Logger(BrandRouteService.name);

  /** ≥ this (EUR) flags a listing as a TGE/luxury promotion candidate. */
  static readonly TGE_SUGGESTION_THRESHOLD_EUR = 1_000_000;

  constructor(private readonly financialData: FinancialDataService) {}

  async decide(listing: CanonicalListingInput): Promise<BrandRouting> {
    const priceEur = await this.toEur(listing.price, listing.currency, listing);
    const promotionSuggested =
      priceEur >= BrandRouteService.TGE_SUGGESTION_THRESHOLD_EUR;

    if (promotionSuggested) {
      this.logger.log(
        `${listing.source}:${listing.externalId} priced at €${priceEur} — ` +
          `imported to REVERY (affordable); flagged as a TGE promotion candidate.`,
      );
    }

    return {
      priceEur,
      tier: PropertyTier.affordable,
      brand: Brand.revery,
      promotionSuggested,
    };
  }

  /**
   * Convert a source-currency price to EUR. EUR passes through. RON converts
   * via the synced EUR_RON indicator; when that rate is unavailable we THROW
   * rather than store a RON figure mislabelled as EUR — a wrong price is worse
   * than skipping the listing for this run. Any other currency is unsupported
   * in Phase 1 and also throws (the orchestrator records it per-item).
   */
  private async toEur(
    price: number,
    currency: string,
    listing: CanonicalListingInput,
  ): Promise<number> {
    const cur = currency.trim().toUpperCase();
    if (cur === 'EUR') return Math.round(price);
    if (cur === 'RON') {
      const rate = await this.financialData.getEurRonRate();
      if (!rate) {
        throw new Error(
          `cannot convert RON price for ${listing.source}:${listing.externalId} — ` +
            `EUR_RON indicator not synced`,
        );
      }
      return Math.round(price / rate);
    }
    throw new Error(
      `unsupported currency "${currency}" for ${listing.source}:${listing.externalId}`,
    );
  }
}
