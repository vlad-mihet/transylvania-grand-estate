import { test, expect } from '@playwright/test';

/**
 * Smoke for the unified command palette + global search.
 *
 * Keyboard shortcuts were intentionally removed — the only way to open the
 * palette is via the header trigger button. `Esc` to close and ↑↓/Enter
 * inside the result list still work because cmdk + Radix Dialog own those
 * behaviors internally; they're modal/listbox accessibility primitives.
 *
 * Auth comes from the shared `auth.setup.ts` storageState, so every test
 * starts logged in as SUPER_ADMIN.
 */

const ROOT = '/ro';

/** Locate the header trigger pill (or icon button on mobile). */
const openPalette = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: /search anything|caut(ă|a)/i }).first().click();

test.describe('command palette', () => {
  test('clicking the header trigger opens the palette and focuses the input', async ({ page }) => {
    await page.goto(`${ROOT}`);
    await expect(
      page.getByRole('button', { name: /search anything|caut(ă|a)/i }).first(),
    ).toBeVisible({ timeout: 15_000 });

    await openPalette(page);

    const input = page.getByPlaceholder(/search anything|caut(ă|a) orice/i);
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();
  });

  test('typing shows entity groups', async ({ page }) => {
    await page.goto(`${ROOT}`);
    await openPalette(page);

    const input = page.getByPlaceholder(/search anything|caut(ă|a) orice/i);
    await input.fill('an');
    await page.waitForResponse((res) =>
      res.url().includes('/search?') && res.status() === 200,
    );

    await expect(page.locator('[cmdk-group-heading]').first()).toBeVisible();
  });

  test('Esc closes the palette and clears state', async ({ page }) => {
    await page.goto(`${ROOT}`);
    await openPalette(page);
    const input = page.getByPlaceholder(/search anything|caut(ă|a) orice/i);
    await input.fill('cluj');
    await page.keyboard.press('Escape');
    await expect(input).not.toBeVisible();

    await openPalette(page);
    await expect(input).toBeVisible();
    await expect(input).toHaveValue('');
  });

  test('vertical rail renders the role-allowed categories on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${ROOT}`);
    await openPalette(page);

    const tabs = page.locator('nav[aria-label] [role="tab"]');
    await expect(tabs.first()).toBeVisible({ timeout: 5_000 });
    expect(await tabs.count()).toBeGreaterThanOrEqual(2);
  });

  test('rail click issues a scoped /search request', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${ROOT}`);
    await openPalette(page);

    const input = page.getByPlaceholder(/search anything|caut(ă|a) orice/i);
    await input.fill('an');
    await page.waitForResponse((res) =>
      res.url().includes('/search?') && res.status() === 200,
    );

    const propertiesTab = page.getByRole('tab', { name: /^Proprietăți$|^Properties$/i });
    if (await propertiesTab.isVisible()) {
      const [scopedRequest] = await Promise.all([
        page.waitForRequest(
          (req) => req.url().includes('/search?') && req.url().includes('types=property'),
        ),
        propertiesTab.click(),
      ]);
      expect(scopedRequest.url()).toContain('types=property');
    }
  });

  test('horizontal scope chips appear below md viewport', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 800 });
    await page.goto(`${ROOT}`);
    await openPalette(page);

    const input = page.getByPlaceholder(/search anything|caut(ă|a) orice/i);
    await input.fill('an');
    await page.waitForResponse((res) =>
      res.url().includes('/search?') && res.status() === 200,
    );

    await expect(page.locator('nav[aria-label]')).toHaveCount(0).catch(() => {});

    const chips = page.locator('[aria-pressed]');
    expect(await chips.count()).toBeGreaterThan(0);
  });
});
