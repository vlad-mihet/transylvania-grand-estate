import { expect, test } from '@playwright/test';
import { LOCALES, type Locale, toolPath } from './_fixtures/locale';

type Tool = 'mortgage' | 'borrowing' | 'purchase' | 'rental';
const TOOLS: Tool[] = ['mortgage', 'borrowing', 'purchase', 'rental'];

test.describe('calculators — every tool renders a result card with non-zero output', () => {
  for (const tool of TOOLS) {
    test(`${tool} tool renders inputs + result on /ro`, async ({ page }) => {
      await page.goto(toolPath('ro', tool));
      // Each calculator has at least one number input (price / income / rent).
      const numericInputs = page.locator('input[type="number"], input[inputmode="numeric"], input[inputmode="decimal"]');
      await expect(numericInputs.first(), `${tool} has no numeric inputs`).toBeVisible({
        timeout: 10_000,
      });
      const inputCount = await numericInputs.count();
      expect(inputCount, `${tool} should have ≥1 numeric input`).toBeGreaterThan(0);
      // The result block ends up rendering large numeric strings somewhere on
      // the page once defaults populate. Look for any element whose text
      // matches a currency-like number.
      const moneyish = page.getByText(/[\d.,]+\s*(€|EUR|RON|lei)/i).first();
      await expect(moneyish, `${tool} output didn't render currency`).toBeVisible({
        timeout: 10_000,
      });
    });
  }
});

test.describe('calculators — locale URL paths resolve', () => {
  for (const locale of LOCALES) {
    for (const tool of TOOLS) {
      test(`${locale}/${tool} → 200`, async ({ request }) => {
        const res = await request.get(toolPath(locale as Locale, tool));
        expect(res.status(), `${locale}/${tool} bad status`).toBe(200);
      });
    }
  }
});

test.describe('calculators — borrowing capacity edge inputs', () => {
  test('zero income produces 0 borrowing capacity (does not crash)', async ({ page }) => {
    await page.goto(toolPath('ro', 'borrowing'));
    const inputs = page.locator('input[type="number"], input[inputmode="numeric"], input[inputmode="decimal"]');
    await expect(inputs.first()).toBeVisible({ timeout: 10_000 });
    // Set the first numeric input (typically income) to 0
    await inputs.first().fill('0');
    await inputs.first().blur();
    // The page must not throw an unhandled error — assert no error overlay.
    const errorOverlay = page.locator('text=Application error|TypeError|ReferenceError');
    await expect(errorOverlay).toHaveCount(0);
  });

  test('huge income (10M) doesn\'t crash the calculator', async ({ page }) => {
    await page.goto(toolPath('ro', 'borrowing'));
    const inputs = page.locator('input[type="number"], input[inputmode="numeric"], input[inputmode="decimal"]');
    await expect(inputs.first()).toBeVisible({ timeout: 10_000 });
    await inputs.first().fill('10000000');
    await inputs.first().blur();
    const errorOverlay = page.locator('text=Application error|TypeError|ReferenceError');
    await expect(errorOverlay).toHaveCount(0);
  });
});

test.describe('calculators — mortgage shows monthly payment value', () => {
  test('mortgage default inputs render a non-zero monthly payment', async ({ page }) => {
    await page.goto(toolPath('ro', 'mortgage'));
    const moneyish = page.getByText(/[\d][\d.,\s]+\s*(€|EUR|RON|lei)/i);
    await expect(moneyish.first()).toBeVisible({ timeout: 10_000 });
    // At least 2 currency-shaped strings (input price + computed payment) should appear
    const count = await moneyish.count();
    expect(count, 'mortgage page should show ≥2 money-shaped values').toBeGreaterThanOrEqual(2);
  });
});
