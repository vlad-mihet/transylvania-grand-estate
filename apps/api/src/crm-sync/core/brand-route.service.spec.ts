import { Brand, PropertyTier } from '@prisma/client';
import type { CanonicalListingInput } from '@tge/types';
import { BrandRouteService } from './brand-route.service';
import { FinancialDataService } from '../../financial-data/financial-data.service';

/**
 * Brand routing encodes the product rule that imports ALWAYS land in
 * REVERY/affordable — TGE is never auto-populated — plus the RON→EUR
 * normalization the threshold depends on. Both are core (CRM-agnostic)
 * concerns, so they're tested without any adapter.
 */
describe('BrandRouteService', () => {
  const listing = (
    over: Partial<CanonicalListingInput> = {},
  ): CanonicalListingInput =>
    ({ source: 'rebs', externalId: '1', price: 0, currency: 'EUR', ...over } as
      CanonicalListingInput);

  const makeService = (rate: number | null) => {
    const financial = {
      getEurRonRate: jest.fn().mockResolvedValue(rate),
    } as unknown as FinancialDataService;
    return new BrandRouteService(financial);
  };

  it('always routes imports to REVERY / affordable regardless of price', async () => {
    const svc = makeService(null);
    const cheap = await svc.decide(listing({ price: 80000, currency: 'EUR' }));
    const pricey = await svc.decide(listing({ price: 5_000_000, currency: 'EUR' }));
    for (const r of [cheap, pricey]) {
      expect(r.tier).toBe(PropertyTier.affordable);
      expect(r.brand).toBe(Brand.revery);
    }
  });

  it('flags (but does not act on) a TGE promotion candidate at ≥ €1M', async () => {
    const svc = makeService(null);
    expect((await svc.decide(listing({ price: 999_000 }))).promotionSuggested).toBe(
      false,
    );
    expect(
      (await svc.decide(listing({ price: 1_000_000 }))).promotionSuggested,
    ).toBe(true);
  });

  it('converts RON prices to EUR via the synced rate', async () => {
    const svc = makeService(5); // 5 RON = 1 EUR
    const r = await svc.decide(listing({ price: 5_000_000, currency: 'RON' }));
    expect(r.priceEur).toBe(1_000_000);
    expect(r.promotionSuggested).toBe(true);
  });

  it('passes EUR prices through unchanged (rounded)', async () => {
    const svc = makeService(5);
    const r = await svc.decide(listing({ price: 249999.6, currency: 'EUR' }));
    expect(r.priceEur).toBe(250000);
  });

  it('throws on RON when no EUR_RON rate is available (never stores a wrong price)', async () => {
    const svc = makeService(null);
    await expect(
      svc.decide(listing({ price: 1_000_000, currency: 'RON' })),
    ).rejects.toThrow(/EUR_RON/);
  });

  it('throws on unsupported currencies', async () => {
    const svc = makeService(5);
    await expect(
      svc.decide(listing({ price: 100000, currency: 'USD' })),
    ).rejects.toThrow(/unsupported currency/);
  });
});
