import { Brand, PrismaClient } from '@prisma/client';

/**
 * Tag a city with brand memberships (`city_brands`) so brand-scoped property,
 * agent, and developer queries can see fixtures placed in it.
 *
 * Brand visibility is gated by this join table — a city's *absence* for a
 * brand makes its properties invisible on that brand's site and turns detail
 * lookups into 404s (see apps/api/src/common/site/brand-where.util.ts). The
 * production seed populates it in a dedicated phase; e2e fixtures build their
 * own cities, so they must tag them here too.
 *
 * Defaults to both brands — most fixtures place a city in Cluj-Napoca, which
 * belongs to both TGE (Transylvania) and Revery (unrestricted). Idempotent via
 * `skipDuplicates`, so it is safe to call in every `beforeEach`.
 */
export async function tagCityBrands(
  prisma: PrismaClient,
  cityId: string,
  brands: Brand[] = [Brand.tge, Brand.revery],
): Promise<void> {
  await prisma.cityBrand.createMany({
    data: brands.map((brand) => ({ cityId, brand })),
    skipDuplicates: true,
  });
}
