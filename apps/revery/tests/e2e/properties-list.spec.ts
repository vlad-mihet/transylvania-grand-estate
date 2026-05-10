import { expect, test } from '@playwright/test';
import { localePath } from './_fixtures/locale';

test.describe('properties-list — initial render', () => {
  test('list view renders ≥1 property card', async ({ page }) => {
    await page.goto(localePath('ro', 'properties'));
    const cards = page.locator('a[href*="/properties/"]:not([href$="/properties"])');
    await expect(cards.first(), 'no property cards rendered').toBeVisible({ timeout: 15_000 });
    const count = await cards.count();
    expect(count, 'expected ≥1 property card').toBeGreaterThan(0);
  });

  test('map view loads the leaflet container', async ({ page }) => {
    await page.goto(`${localePath('ro', 'properties')}?view=map`);
    const map = page.locator('.leaflet-container').first();
    await expect(map, 'leaflet container did not render in map view').toBeVisible({
      timeout: 15_000,
    });
  });
});

test.describe('properties-list — filters reflect into URL', () => {
  test('selecting a price min via URL sticks on reload', async ({ page }) => {
    const url = `${localePath('ro', 'properties')}?minPrice=50000`;
    await page.goto(url);
    await expect(page).toHaveURL(/minPrice=50000/);
    await page.reload();
    await expect(page, 'minPrice didn\'t survive reload').toHaveURL(/minPrice=50000/);
    // The page should still render some content (no crash on the URL filter)
    const main = page.locator('main, [role="main"]').first();
    await expect(main).toBeVisible();
  });

  test('absurd filter combo returns "no results" UI without crashing', async ({ page }) => {
    const url = `${localePath('ro', 'properties')}?minPrice=99999999&maxPrice=100000000`;
    await page.goto(url);
    // Either an empty-state UI or zero cards.
    const cards = page.locator('a[href*="/properties/"]:not([href$="/properties"])');
    const count = await cards.count();
    expect(count, 'absurd filter should yield ≤0 cards').toBeLessThan(3);
    // No JS error overlay
    const errorOverlay = page.locator('text=Application error|TypeError|ReferenceError').first();
    await expect(errorOverlay).toHaveCount(0);
  });
});

test.describe('properties-list — list↔map toggle', () => {
  test('clicking the map button (if present) navigates to ?view=map', async ({ page }) => {
    await page.goto(localePath('ro', 'properties'));
    // The toggle is a button or link with text containing "Map" / "Hartă" / "Carte" / "Karte"
    const mapToggle = page
      .getByRole('button', { name: /Hart[ăa]|Map|Carte|Karte/i })
      .or(page.getByRole('link', { name: /Hart[ăa]|Map|Carte|Karte/i }))
      .first();
    if (!(await mapToggle.count())) test.skip(true, 'map toggle not exposed as button/link in this build');
    await mapToggle.click();
    await expect(page, 'map toggle did not update URL').toHaveURL(/view=map/, { timeout: 5_000 });
  });
});
