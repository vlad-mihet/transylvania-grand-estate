import { expect, test } from '@playwright/test';
import { LOCALES, type Locale } from './_fixtures/locale';
import { STATIC_ROUTES } from './_fixtures/routes';

test.describe('routes — every public route loads in every locale', () => {
  for (const locale of LOCALES) {
    test.describe(`locale=${locale}`, () => {
      for (const route of STATIC_ROUTES) {
        test(`${route.id} → 200 + visible h1`, async ({ page }) => {
          const path = route.path(locale as Locale);
          const response = await page.goto(path);
          expect(response, `no response for ${path}`).not.toBeNull();
          expect(response!.status(), `${path} returned ${response!.status()}`).toBe(200);
          const heading = page.getByRole('heading', { level: 1 }).first();
          await expect(heading, `${path} has no <h1>`).toBeVisible({ timeout: 10_000 });
          const text = (await heading.textContent())?.trim() ?? '';
          expect(text.length, `${path} <h1> is empty`).toBeGreaterThan(0);
        });
      }
    });
  }
});

test.describe('routes — root locale redirects', () => {
  test('/ redirects to default locale (/ro)', async ({ page }) => {
    const response = await page.goto('/');
    expect(response).not.toBeNull();
    expect(page.url()).toMatch(/\/ro(\/|$)/);
  });
});
