import { expect, test } from '@playwright/test';
import { LOCALES, type Locale, localePath } from './_fixtures/locale';
import { findLuxurySlug } from './_fixtures/api';

const GARBAGE = 'does-not-exist-zzz-please-404';

const RESOURCE_PARENTS = ['properties', 'cities', 'agents', 'developers', 'blog'] as const;

test.describe('not-found — invalid slugs return 404', () => {
  for (const locale of LOCALES) {
    for (const parent of RESOURCE_PARENTS) {
      test(`/${locale}/${parent}/${GARBAGE} → 404`, async ({ request }) => {
        const res = await request.get(localePath(locale as Locale, `${parent}/${GARBAGE}`));
        expect(res.status(), `${parent} garbage slug should 404`).toBe(404);
      });
    }
  }
});

test.describe('not-found — cross-tier guard (luxury slug under Revery)', () => {
  let luxurySlug: string;
  test.beforeAll(async () => {
    luxurySlug = await findLuxurySlug();
  });

  for (const locale of LOCALES) {
    test(`/${locale}/properties/<luxury slug> → 404 (cross-tier blocked)`, async ({
      request,
    }) => {
      const res = await request.get(localePath(locale as Locale, `properties/${luxurySlug}`));
      expect(res.status(), `luxury slug must not leak into Revery`).toBe(404);
    });
  }
});

test.describe('not-found — invalid locale prefix', () => {
  test('/xx/ → 404 (unsupported locale)', async ({ request }) => {
    const res = await request.get('/xx/');
    expect(res.status()).toBe(404);
  });

  test('/zz/properties → 404', async ({ request }) => {
    const res = await request.get('/zz/properties');
    expect(res.status()).toBe(404);
  });
});
