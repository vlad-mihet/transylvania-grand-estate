import { test, expect } from '@playwright/test';
import {
  adminApi,
  apiAsBrand,
  getAdminAccessToken,
  postInquiryAsBrand,
  syntheticIp,
  uniqueSuffix,
  type ApiEnvelope,
} from './_fixtures/api';

type Inquiry = {
  id: string;
  name: string;
  email: string;
  message: string;
  type: string;
  status: 'new' | 'read' | 'archived';
  source?: string | null;
  siteId?: string | null;
  deletedAt?: string | null;
};

/**
 * Simulates a public Landing/Revery inquiry submission, then verifies the
 * full admin lifecycle: visible in list → status PATCH → soft-delete → restore.
 */
test.describe('inquiries lifecycle', () => {
  test('submit from Landing → admin list → status → soft-delete → restore', async ({
    page,
  }) => {
    const suffix = uniqueSuffix('inq');
    const email = `${suffix}@qa.test`;
    const ip = syntheticIp(suffix);
    const message = `QA inquiry ${suffix}`;

    // 1. Submit as a Landing visitor (X-Site: TGE_LUXURY).
    const submitRes = await postInquiryAsBrand(
      'TGE_LUXURY',
      {
        type: 'general',
        name: `QA ${suffix}`,
        email,
        message,
        gdprConsent: true,
        source: 'tge-contact',
        sourceUrl: 'http://localhost:3050/ro/contact',
      },
      { forwardedFor: ip },
    );
    expect(submitRes.ok, `inquiry POST failed: ${await submitRes.text()}`).toBeTruthy();

    // 2. Mint an admin token, fetch the inquiry as ADMIN (sees all sites).
    const token = getAdminAccessToken();
    const envelope = await adminApi<ApiEnvelope<Inquiry[]>>(
      token,
      `/inquiries?limit=20`,
    );
    const found = envelope.data.find((i) => i.email === email);
    expect(found, `inquiry with email ${email} not found in admin list`).toBeDefined();
    expect(found!.siteId).toBe('TGE_LUXURY');
    expect(found!.source).toBe('tge-contact');
    const inquiryId = found!.id;

    // 3. Status PATCH: new → read.
    await adminApi(token, `/inquiries/${inquiryId}/status`, {
      method: 'PATCH',
      body: { status: 'read' },
    });
    let after = await adminApi<ApiEnvelope<Inquiry>>(token, `/inquiries/${inquiryId}`);
    expect(after.data.status).toBe('read');

    // 4. Soft-delete.
    await adminApi(token, `/inquiries/${inquiryId}`, { method: 'DELETE' });

    // After delete the row should be hidden from default list.
    const afterDelete = await adminApi<ApiEnvelope<Inquiry[]>>(
      token,
      `/inquiries?limit=50`,
    );
    expect(afterDelete.data.find((i) => i.id === inquiryId)).toBeUndefined();

    // 5. Restore.
    await adminApi(token, `/inquiries/${inquiryId}/restore`, { method: 'POST' });
    after = await adminApi<ApiEnvelope<Inquiry>>(token, `/inquiries/${inquiryId}`);
    expect(after.data.deletedAt ?? null).toBeNull();
  });

  test('Revery submission stamps siteId=REVERY', async ({ page }) => {
    const suffix = uniqueSuffix('inq-rev');
    const email = `${suffix}@qa.test`;
    const ip = syntheticIp(suffix);

    const submitRes = await postInquiryAsBrand(
      'REVERY',
      {
        type: 'general',
        name: `QA ${suffix}`,
        email,
        message: `revery test ${suffix}`,
        gdprConsent: true,
        source: 'reveria-contact',
        sourceUrl: 'http://localhost:3052/ro/contact',
      },
      { forwardedFor: ip },
    );
    expect(submitRes.ok).toBeTruthy();

    const token = getAdminAccessToken();
    const env = await adminApi<ApiEnvelope<Inquiry[]>>(token, `/inquiries?limit=20`);
    const found = env.data.find((i) => i.email === email);
    expect(found?.siteId).toBe('REVERY');
  });
});
