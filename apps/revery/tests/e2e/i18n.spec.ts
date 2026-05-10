import { expect, test } from '@playwright/test';
import { LOCALES, type Locale, localePath } from './_fixtures/locale';

const ROMANIAN_DIACRITICS = ['ă', 'â', 'î', 'ș', 'ț'] as const;

test.describe('i18n — Romanian diacritics on /ro pages', () => {
  for (const route of ['', 'properties', 'about', 'contact', 'faq']) {
    test(`/ro/${route || ''} renders at least one Romanian diacritic`, async ({ page }) => {
      await page.goto(localePath('ro', route));
      const body = (await page.locator('body').innerText()).toLowerCase();
      const hits = ROMANIAN_DIACRITICS.filter((d) => body.includes(d));
      expect(
        hits.length,
        `/ro/${route} body has no Romanian diacritics — likely ASCII-only fallback (see feedback_diacritics.md)`,
      ).toBeGreaterThan(0);
    });
  }
});

test.describe('i18n — html lang attribute matches URL locale', () => {
  for (const locale of LOCALES) {
    test(`<html lang="${locale}"> on /${locale}`, async ({ page }) => {
      await page.goto(localePath(locale as Locale, ''));
      const html = page.locator('html');
      await expect(html).toHaveAttribute('lang', locale);
    });
  }
});

test.describe('i18n — every locale navigates without crashing', () => {
  // Catches the previously-observed intermittent /fr and /de 500s.
  for (const locale of LOCALES) {
    test(`/${locale} home loads with status 200`, async ({ request }) => {
      const res = await request.get(localePath(locale as Locale, ''));
      expect(res.status(), `${locale} home returned ${res.status()}`).toBe(200);
    });
  }
});

test.describe('i18n — fr / de translation freshness', () => {
  // The English-paste sections in fr.json / de.json (CitiesPage, FAQPage, etc.)
  // reveal as identical headings between en and fr/de. Visit the same page in
  // each locale and assert at least one visible string differs from the en
  // baseline, which is the minimum sign that translation actually happened.
  // Smoke-only — flag for translators, not a hard fail.
  test('fr /faq h1 should differ from en', async ({ page }) => {
    await page.goto(localePath('en', 'faq'));
    const enH1 = (await page.getByRole('heading', { level: 1 }).first().textContent()) ?? '';
    await page.goto(localePath('fr', 'faq'));
    const frH1 = (await page.getByRole('heading', { level: 1 }).first().textContent()) ?? '';
    expect(
      frH1,
      `fr FAQ h1 ("${frH1}") matches en — likely paste-of-en in fr.json`,
    ).not.toBe(enH1);
  });

  test('de /faq h1 should differ from en', async ({ page }) => {
    await page.goto(localePath('en', 'faq'));
    const enH1 = (await page.getByRole('heading', { level: 1 }).first().textContent()) ?? '';
    await page.goto(localePath('de', 'faq'));
    const deH1 = (await page.getByRole('heading', { level: 1 }).first().textContent()) ?? '';
    expect(
      deH1,
      `de FAQ h1 ("${deH1}") matches en — likely paste-of-en in de.json`,
    ).not.toBe(enH1);
  });
});
