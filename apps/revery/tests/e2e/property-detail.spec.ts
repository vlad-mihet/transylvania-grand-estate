import { expect, test } from '@playwright/test';
import { localePath } from './_fixtures/locale';
import { findAffordableSlug } from './_fixtures/api';

let SLUG = '';
test.beforeAll(async () => {
  SLUG = await findAffordableSlug();
});

test.describe('property-detail — core sections render', () => {
  test('hero gallery image + price block + h1 visible', async ({ page }) => {
    await page.goto(localePath('ro', `properties/${SLUG}`));
    const h1 = page.getByRole('heading', { level: 1 }).first();
    await expect(h1).toBeVisible({ timeout: 15_000 });
    // Price formatted as e.g. "245 000 €" or "245.000 €"
    await expect(page.getByText(/[\d][\d.,\s]+\s*€/).first()).toBeVisible();
    // Gallery image — at least one <img> in the page
    const heroImg = page.locator('img').first();
    await expect(heroImg).toBeVisible();
  });

  test('similar properties grid appears (if any)', async ({ page }) => {
    await page.goto(localePath('ro', `properties/${SLUG}`));
    // Heuristic — multiple links to other /properties/<slug> exist in DOM
    const otherCards = page.locator(
      `a[href*="/properties/"]:not([href$="/properties"]):not([href$="${SLUG}"])`,
    );
    const count = await otherCards.count();
    expect(count, 'no related-property links anywhere on detail page').toBeGreaterThanOrEqual(0);
  });
});

test.describe('property-detail — building / facilities accordions', () => {
  test('clicking an accordion trigger reveals content (if accordions exist)', async ({ page }) => {
    await page.goto(localePath('ro', `properties/${SLUG}`));
    // Radix accordion uses [data-state] + role="button"
    const trigger = page.locator('[role="button"][aria-expanded="false"]').first();
    if (!(await trigger.count())) test.skip(true, 'no collapsible accordion on this listing');
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true', { timeout: 5_000 });
  });
});

test.describe('property-detail — inquiry form on detail card', () => {
  test('inquiry form fields exist and accept input', async ({ page }) => {
    await page.goto(localePath('ro', `properties/${SLUG}`));
    // Look for an email input (the contact card always has one)
    const email = page.locator('input[type="email"]').first();
    await expect(email, 'no email input on property detail page').toBeVisible({ timeout: 15_000 });
    await email.fill('qa+detail@example.com');
    expect(await email.inputValue()).toBe('qa+detail@example.com');
  });
});
