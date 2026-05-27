import { expect, test } from '@playwright/test';
import { localePath } from './_fixtures/locale';
import { findAffordableSlug, postInquiry, syntheticIp } from './_fixtures/api';

const FAKE_INQUIRY = {
  name: 'QA Bot',
  email: `qa+${Date.now()}@example.com`,
  phone: '+40712345678',
  message: 'Automated QA probe — please ignore.',
};

test.describe('forms — contact form (browser)', () => {
  test('submitting empty form shows native required-field error (no API call)', async ({ page }) => {
    await page.goto(localePath('ro', 'contact'));
    let postCalls = 0;
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().includes('/inquiries')) postCalls += 1;
    });
    // Submit is disabled until the GDPR consent box is ticked; tick it so the
    // button is clickable, then rely on native required-field validation to
    // block the empty submit.
    await page.locator('#contact-consent').click();
    const submit = page.getByRole('button', { name: /Trimite|Send|Envoyer|Senden/i }).first();
    await submit.click();
    // HTML5 validation should block submission. No network POST should fire.
    await page.waitForTimeout(300);
    expect(postCalls, 'empty submit must not POST').toBe(0);
    // The first invalid input gets focus and `:invalid` pseudo-class.
    const invalid = await page.locator('input:invalid, textarea:invalid').count();
    expect(invalid, 'no fields marked invalid after empty submit').toBeGreaterThan(0);
  });

  test('valid submit reaches success state', async ({ page }) => {
    await page.goto(localePath('ro', 'contact'));
    // Target the real name field by id — the generic `input[type="text"]`
    // selector also matches the off-screen honeypot (`name="website"`, which
    // is opacity:0 but still Playwright-visible), leaving the required name
    // empty so native validation silently blocks the submit.
    await page.locator('#contact-name').fill(FAKE_INQUIRY.name);
    await page.locator('#contact-email').fill(FAKE_INQUIRY.email);
    const phone = page.locator('input[type="tel"]');
    if (await phone.count()) await phone.fill(FAKE_INQUIRY.phone);
    await page.locator('textarea').fill(FAKE_INQUIRY.message);
    // Required GDPR consent — submit stays disabled until this is ticked.
    await page.locator('#contact-consent').click();
    await page.getByRole('button', { name: /Trimite|Send|Envoyer|Senden/i }).first().click();
    // Success state shows a heading like "Mulțumim!" / "Thank You!" / etc.
    const successHeading = page
      .getByRole('heading', { name: /Mul[țt]umim|Thank You|Merci|Danke/i })
      .first();
    await expect(successHeading, 'no success heading after valid submit').toBeVisible({
      timeout: 15_000,
    });
  });
});

test.describe.serial('forms — property inquiry (API contract)', () => {
  test('POST /inquiries with property entitySlug round-trips source field (re-verifies Critical #4)', async () => {
    const slug = await findAffordableSlug();
    const source = `qa-revery-${Date.now()}`;
    const res = await postInquiry(
      {
        name: 'QA Bot',
        email: `qa+source-${Date.now()}@example.com`,
        phone: '+40712345678',
        budget: '50kTo100k',
        // createInquirySchema requires message length >= 10.
        message: 'Source persistence QA probe — please ignore.',
        type: 'property',
        // Allowed Zod fields only — sourceSuffix is hook-config, not API payload.
        source,
        entitySlug: slug,
        propertySlug: slug,
        // createInquirySchema requires explicit GDPR consent (the form stamps
        // this when the privacy checkbox is ticked).
        gdprConsent: true,
      },
      { forwardedFor: syntheticIp('forms-source-roundtrip') },
    );
    expect(res.status, `inquiry POST returned ${res.status}`).toBe(201);
    const body = (await res.json()) as { data?: { source?: string } };
    expect(body.data?.source, 'inquiry response missing source').toBe(source);
  });

  test('POST /inquiries with bad email + short message → 400 Zod', async () => {
    const res = await postInquiry(
      {
        name: 'QA Bot',
        email: 'not-an-email',
        phone: '+40000',
        budget: '50kTo100k',
        message: 'too short',
        type: 'general',
        // Consent present so the 400 is attributable to the bad email + short
        // message, not the missing GDPR gate.
        gdprConsent: true,
      },
      { forwardedFor: syntheticIp('forms-bad-input') },
    );
    expect([400, 422]).toContain(res.status);
  });
});
