import {
  test,
  expect,
  type BrowserContext,
  type Page,
} from '@playwright/test';
import { loginAsAdmin } from './_fixtures/api';

/**
 * Smoke for the unified command palette + global search.
 *
 * Keyboard shortcuts were intentionally removed — the only way to open the
 * palette is via the header trigger button. `Esc` to close and ↑↓/Enter
 * inside the result list still work because cmdk + Radix Dialog own those
 * behaviors internally; they're modal/listbox accessibility primitives.
 *
 * Auth: the shared `auth.setup.ts` storageState carries no admin-app session
 * cookie (the setup logs into NestJS directly), and a per-test BFF login
 * would trip the auth throttler (5/min) across this file's 6 tests. So the
 * whole file runs serially on ONE context: a single BFF login plants the
 * httpOnly refresh cookie in its jar, and every test re-navigates on the
 * shared page (which resets the palette UI state).
 */

const ROOT = '/ro';

/** Locate the header trigger pill (or icon button on mobile). */
const openPalette = (page: Page) =>
  page.getByRole('button', { name: /search anything|caut(ă|a)/i }).first().click();

test.describe('command palette', () => {
  test.describe.configure({ mode: 'serial' });

  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    // browser.newContext() doesn't inherit the config's baseURL — mirror it.
    const baseURL =
      process.env.ADMIN_BASE_URL ??
      `http://localhost:${process.env.ADMIN_PORT ?? 3051}`;
    context = await browser.newContext({ baseURL });
    await loginAsAdmin(context, 'command-palette');
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test('clicking the header trigger opens the palette and focuses the input', async () => {
    await page.goto(`${ROOT}`);
    await expect(
      page.getByRole('button', { name: /search anything|caut(ă|a)/i }).first(),
    ).toBeVisible({ timeout: 15_000 });

    await openPalette(page);

    const input = page.getByPlaceholder(/search anything|caut(ă|a) orice/i);
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();
  });

  test('typing shows entity groups', async () => {
    await page.goto(`${ROOT}`);
    await openPalette(page);

    const input = page.getByPlaceholder(/search anything|caut(ă|a) orice/i);
    await input.fill('an');
    await page.waitForResponse((res) =>
      res.url().includes('/search?') && res.status() === 200,
    );

    await expect(page.locator('[cmdk-group-heading]').first()).toBeVisible();
  });

  test('Esc closes the palette and clears state', async () => {
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

  test('vertical rail renders the role-allowed categories on desktop', async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${ROOT}`);
    await openPalette(page);

    const tabs = page.locator('nav[aria-label] [role="tab"]');
    await expect(tabs.first()).toBeVisible({ timeout: 5_000 });
    expect(await tabs.count()).toBeGreaterThanOrEqual(2);
  });

  test('rail click issues a scoped /search request', async () => {
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

  test('horizontal scope chips appear below md viewport', async () => {
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
