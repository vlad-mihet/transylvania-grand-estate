import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './_fixtures/api';

/**
 * BUG-107: the unsaved-changes guard only covered `beforeunload` (tab close /
 * reload) — in-app <Link> navigation discarded dirty forms silently. The hook
 * now intercepts internal link clicks with a confirm(). These tests drive the
 * property "new" form (which wires `form.formState.isDirty` into the hook) and
 * click a sidebar link, asserting the guard fires / stays out of the way.
 */
test.describe('unsaved-changes navigation guard', () => {
  const DEV_LINK = /Dezvoltatori|Developers/;

  // Shared storageState has no admin-BFF session cookie (setup logs into
  // NestJS directly), so plant one per-test — same pattern as localized-editor.
  test.beforeEach(async ({ page }, testInfo) => {
    await loginAsAdmin(page.context(), `unsaved-changes-${testInfo.testId}`);
  });

  async function openDirtyForm(page: import('@playwright/test').Page) {
    await page.goto('/ro/properties/new');
    const activeTitle = page.locator('input[id^="title-"]:visible');
    await expect(activeTitle).toBeVisible();
    // Fill a field → RHF marks the form dirty → the guard arms.
    await activeTitle.fill('BUG-107 dirty guard probe');
  }

  test('dismissing the confirm cancels the in-app navigation', async ({
    page,
  }) => {
    await openDirtyForm(page);

    let dialogSeen = false;
    page.once('dialog', (dialog) => {
      dialogSeen = true;
      void dialog.dismiss();
    });

    await page.getByRole('link', { name: DEV_LINK }).first().click();
    await expect.poll(() => dialogSeen).toBe(true);
    // Cancelled → still on the property form.
    await expect(page).toHaveURL(/\/properties\/new/);
  });

  test('accepting the confirm lets the navigation proceed', async ({ page }) => {
    await openDirtyForm(page);

    page.once('dialog', (dialog) => void dialog.accept());
    await page.getByRole('link', { name: DEV_LINK }).first().click();
    await expect(page).toHaveURL(/\/developers/);
  });

  // NB: a "clean form navigates without a prompt" case can't be asserted on the
  // property /new form — it reports form.formState.isDirty === true on load
  // (see BUG-128), so the guard arms immediately. The two cases above prove the
  // interceptor fires and both confirm outcomes route correctly.
});
