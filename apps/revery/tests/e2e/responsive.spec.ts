import { expect, test } from '@playwright/test';
import { localePath } from './_fixtures/locale';

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

const ROUTES = ['', 'properties', 'contact', 'faq'] as const;

test.describe('responsive — no horizontal overflow at common viewports', () => {
  for (const viewport of VIEWPORTS) {
    for (const route of ROUTES) {
      test(`${viewport.name} (${viewport.width}px) on /ro/${route} has no body horizontal scroll`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(localePath('ro', route));
        // Allow a small tolerance — scrollbars take up ~17px on Windows.
        const overflow = await page.evaluate(() => {
          const w = document.documentElement.scrollWidth - document.documentElement.clientWidth;
          return Math.max(0, w);
        });
        expect(
          overflow,
          `${viewport.name} /${route}: documentElement overflows by ${overflow}px`,
        ).toBeLessThanOrEqual(2);
      });
    }
  }
});

test.describe('responsive — mobile shows a hamburger trigger', () => {
  test('375px viewport reveals a mobile-nav trigger', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(localePath('ro', ''));
    // Trigger button has aria-label="Deschide meniul" on /ro per Navigation.openMenu.
    const trigger = page
      .getByRole('button', { name: 'Deschide meniul' })
      .first();
    await expect(trigger, 'no mobile menu trigger at 375px').toBeVisible({ timeout: 10_000 });
  });
});
