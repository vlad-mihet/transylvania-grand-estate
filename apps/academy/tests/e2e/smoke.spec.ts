import { test, expect } from '@playwright/test';

/**
 * Academy smoke: routing, locale, and the auth-gate contract.
 *
 * The academy proxy (src/proxy.ts) gates every path behind login except the
 * auth pages in PUBLIC_PATHS. These tests lock that contract in — home and
 * catalog must bounce anonymous visitors to /login with a returnTo, and the
 * public auth pages must render in every locale without leaking raw i18n keys.
 */

const LOCALES = ['ro', 'en'] as const;

test.describe('academy — auth gate', () => {
  test('home redirects anonymous visitors to login', async ({ page }) => {
    await page.goto('/ro');
    await expect(page).toHaveURL(/\/ro\/login/);
  });

  test('protected route preserves returnTo on the login bounce', async ({
    page,
  }) => {
    await page.goto('/ro/catalog');
    await expect(page).toHaveURL(/\/ro\/login\?returnTo=%2Fcatalog/);
  });

  test('unprefixed root resolves to a locale-prefixed login', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/(ro|en|fr|de)\/login/);
  });
});

test.describe('academy — public auth pages render per locale', () => {
  for (const locale of LOCALES) {
    test(`login renders in ${locale} with email + password fields`, async ({
      page,
    }) => {
      const res = await page.goto(`/${locale}/login`);
      expect(res?.status()).toBe(200);
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      // No unresolved next-intl keys leaked into the DOM.
      await expect(page.locator('body')).not.toContainText('MISSING_MESSAGE');
      await expect(page.locator('body')).not.toContainText(/[a-z]+\.[a-z]+\.[a-z]+/i);
    });

    test(`register renders in ${locale} with the account form`, async ({
      page,
    }) => {
      const res = await page.goto(`/${locale}/register`);
      expect(res?.status()).toBe(200);
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('body')).not.toContainText('MISSING_MESSAGE');
    });
  }

  test('login page carries the correct html lang for the locale', async ({
    page,
  }) => {
    await page.goto('/en/login');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});
