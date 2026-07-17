import { test, expect } from '@playwright/test';

/**
 * Academy auth-form behaviour: client-side validation on login/register and
 * the register → login cross-links. Intentionally does NOT create accounts
 * (that would need a seeded/cleaned academy_users row and email plumbing) —
 * the register → verify → enrol happy path is exercised by the api e2e suite
 * (academy-registration.e2e-spec.ts). This locks the browser-side gates.
 */

test.describe('academy — login form', () => {
  test('submitting empty credentials does not navigate away', async ({
    page,
  }) => {
    await page.goto('/ro/login');
    const submit = page.locator('button[type="submit"]').first();
    await submit.click();
    // Native/zod validation blocks the POST — we stay on /login.
    await expect(page).toHaveURL(/\/ro\/login/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('offers a link to register', async ({ page }) => {
    await page.goto('/ro/login');
    await expect(
      page.getByRole('link', { name: /cont|înregistr|register|creează/i }).first(),
    ).toBeVisible();
  });
});

test.describe('academy — register form', () => {
  test('shows password requirement hints', async ({ page }) => {
    await page.goto('/ro/register');
    // The register form renders a live checklist of password rules.
    await expect(page.locator('body')).toContainText(/caractere/i);
  });

  test('rejects an obviously weak password (no navigation to dashboard)', async ({
    page,
  }) => {
    await page.goto('/ro/register');
    await page.locator('input[type="email"]').fill('weak-pass-probe@example.com');
    await page.locator('input[type="password"]').first().fill('short');
    await page
      .getByRole('button', { name: /Creează|Create|Sign up|Înregistr/i })
      .first()
      .click();
    // Weak password is rejected client-side; we never reach the authed home.
    await expect(page).toHaveURL(/\/ro\/register/);
  });

  test('offers a link back to login', async ({ page }) => {
    await page.goto('/ro/register');
    await expect(
      page.getByRole('link', { name: /Autentific|Conect|Sign in|Log in/i }).first(),
    ).toBeVisible();
  });
});
