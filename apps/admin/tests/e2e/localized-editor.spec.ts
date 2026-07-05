import { test, expect } from '@playwright/test';

/**
 * Regression for Cowork e2e "Bug 1": localized fields lost the inactive
 * locale's value on an editing-locale switch.
 *
 * The editor used to bind a single react-hook-form controller to
 * `title.${active}` and swap `active` on tab change. A controller whose name
 * changes makes RHF drop the previous locale's value, so only the active
 * locale stayed registered — on a single-submit form (property create/edit)
 * every inactive locale then serialized as `undefined`, Zod rejected it
 * ("expected string, received undefined"), and the save never reached the API.
 *
 * The fix mounts one controller per locale with a static name (only the active
 * one is visible), so every locale's value persists. This test drives the real
 * form with real keystroke-equivalent fills and asserts round-trip survival —
 * the exact manual repro, automated.
 */
test.describe('localized editor — per-locale value persistence', () => {
  // The shared storageState carries no admin-app session cookie (the setup
  // logs into NestJS directly). Log in through the BFF on the page's context
  // so its httpOnly refresh cookie lands on the browser jar and AuthProvider
  // restores the session on first navigation.
  test.beforeEach(async ({ page }) => {
    const email = process.env.ADMIN_EMAIL ?? 'admin@transylvaniagrandestate.ro';
    const password = process.env.SEED_ADMIN_PASSWORD;
    if (!password) throw new Error('SEED_ADMIN_PASSWORD env var required');
    const res = await page.request.post('/api/auth/login', {
      data: { email, password },
    });
    expect(res.ok(), `BFF login failed: ${res.status()}`).toBeTruthy();
  });

  test('typed values survive switching the editing locale', async ({ page }) => {
    await page.goto('/ro/properties/new');

    // Only the active locale's input is visible (the others are display:none),
    // so `:visible` is a locale-agnostic handle on "the field you're editing".
    const activeTitle = page.locator('input[id^="title-"]:visible');
    await expect(activeTitle).toBeVisible();

    // RO is primary/active on load.
    await activeTitle.fill('REPRO-RO-TITLE');

    // RO -> EN: the now-visible input is EN's, and starts empty.
    await page.getByRole('tab', { name: /English/ }).click();
    await expect(activeTitle).toHaveValue('');
    await activeTitle.fill('REPRO-EN-TITLE');

    // EN -> RO: the RO value must still be present (the bug wiped it here).
    await page.getByRole('tab', { name: /Română/ }).click();
    await expect(activeTitle).toHaveValue('REPRO-RO-TITLE');

    // RO -> EN once more: EN must also have survived.
    await page.getByRole('tab', { name: /English/ }).click();
    await expect(activeTitle).toHaveValue('REPRO-EN-TITLE');
  });

  // Cowork e2e follow-up: a save blocked by RHF validation used to do nothing
  // at all — no toast, no visible error — because the metadata inputs never
  // rendered their errors and handleSubmit had no invalid handler. Required
  // fields like `neighborhood`/`yearBuilt` sit far from the locale tabs, so the
  // form failed silently and looked like a Bug 1 relapse.
  test('a blocked save surfaces feedback instead of failing silently', async ({
    page,
  }) => {
    await page.goto('/ro/properties/new');
    await expect(page.locator('input[id^="title-"]:visible')).toBeVisible();

    // Submit with the required metadata fields still empty.
    await page.getByRole('button', { name: /Salv/i }).first().click();

    // 1) A global signal fires (the new invalid-submit toast).
    await expect(page.getByText(/before saving/i)).toBeVisible();

    // 2) The offending metadata field now shows its own inline error (these
    //    were previously computed by RHF but never rendered).
    await expect(
      page.locator(
        'div:has(> input#property-neighborhood) > p.text-destructive',
      ),
    ).toBeVisible();
  });
});
