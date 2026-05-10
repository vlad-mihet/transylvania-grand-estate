import { test } from '@playwright/test';
import { localePath } from './_fixtures/locale';
import { expectNoCriticalA11yViolations } from './_fixtures/a11y';
import { findAffordableSlug } from './_fixtures/api';

test.describe('a11y — no critical/serious axe violations on key pages', () => {
  test('home /ro', async ({ page }) => {
    await page.goto(localePath('ro', ''));
    await expectNoCriticalA11yViolations(page);
  });

  test('properties list /ro', async ({ page }) => {
    await page.goto(localePath('ro', 'properties'));
    await expectNoCriticalA11yViolations(page);
  });

  test('contact /ro', async ({ page }) => {
    await page.goto(localePath('ro', 'contact'));
    await expectNoCriticalA11yViolations(page);
  });

  test('faq /ro', async ({ page }) => {
    await page.goto(localePath('ro', 'faq'));
    await expectNoCriticalA11yViolations(page);
  });

  test('about /ro', async ({ page }) => {
    await page.goto(localePath('ro', 'about'));
    await expectNoCriticalA11yViolations(page);
  });

  test('property detail /ro', async ({ page }) => {
    const slug = await findAffordableSlug();
    await page.goto(localePath('ro', `properties/${slug}`));
    await expectNoCriticalA11yViolations(page);
  });
});
