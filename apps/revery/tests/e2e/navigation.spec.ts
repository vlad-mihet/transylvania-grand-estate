import { expect, test } from '@playwright/test';
import { LOCALES, type Locale, localePath } from './_fixtures/locale';

test.describe('navigation — top-level nav + footer present on every locale home', () => {
  for (const locale of LOCALES) {
    test(`${locale}: header + footer landmarks render`, async ({ page }) => {
      await page.goto(localePath(locale as Locale, ''));
      const banner = page.getByRole('banner').first();
      await expect(banner, 'no <header role="banner">').toBeVisible();
      const contentinfo = page.getByRole('contentinfo').first();
      await expect(contentinfo, 'no <footer role="contentinfo">').toBeVisible();
      const main = page.getByRole('main').first();
      await expect(main, 'no <main>').toBeVisible();
    });

    test(`${locale}: at least one nav link to /properties`, async ({ page }) => {
      await page.goto(localePath(locale as Locale, ''));
      const propertiesLink = page
        .locator('a[href$="/properties"], a[href*="/properties?"]')
        .first();
      await expect(propertiesLink, 'no link to /properties anywhere').toBeVisible();
    });
  }
});

test.describe('navigation — language switcher round-trip', () => {
  test('switching ro → en preserves /properties path', async ({ page }) => {
    await page.goto(localePath('ro', 'properties'));
    await expect(page).toHaveURL(/\/ro\/properties/);
    // Trigger button has aria-label="Limbă" on /ro per Navigation.language.
    const trigger = page.getByRole('button', { name: 'Limbă' }).first();
    await expect(trigger, 'language switcher trigger missing on /ro').toBeVisible({
      timeout: 10_000,
    });
    await trigger.click();
    // Radix Select renders DropdownMenuRadioItem options — role=menuitemradio
    // with the autonym text ("English" for en).
    const englishOption = page.getByRole('menuitemradio', { name: 'English' }).first();
    await expect(englishOption, 'English option not found in dropdown').toBeVisible({
      timeout: 5_000,
    });
    await englishOption.click();
    await expect(page, 'URL did not switch to /en/properties').toHaveURL(/\/en\/properties/, {
      timeout: 10_000,
    });
  });
});

test.describe('navigation — skip to main content', () => {
  test('skip-link element exists and points at #main-content', async ({ page }) => {
    await page.goto(localePath('ro', ''));
    const skipLink = page.locator('a[href="#main-content"]').first();
    await expect(skipLink, 'skip-to-main link missing').toHaveCount(1);
    const href = await skipLink.getAttribute('href');
    expect(href).toBe('#main-content');
    const main = page.locator('#main-content');
    await expect(main, '#main-content target missing').toHaveCount(1);
  });
});

test.describe('navigation — breadcrumbs on detail pages', () => {
  test('contact page has visible breadcrumb to home', async ({ page }) => {
    await page.goto(localePath('ro', 'contact'));
    const homeCrumb = page.getByRole('link', { name: /Acasă|Home|Accueil|Startseite/i }).first();
    await expect(homeCrumb).toBeVisible();
  });
});
