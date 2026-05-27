import { expect, test } from '@playwright/test';
import { postInquiry, syntheticIp } from './_fixtures/api';

// Closes Major #16 (2026-05-09): the third-party `@nestjs/throttler` setup
// silently degraded under bursts. Inquiries now layer a dedicated
// `InquiryRateLimitGuard` (apps/api/src/inquiries/inquiry-rate-limit.guard.ts)
// on top of @Throttle. This spec is the cluster-level regression gate;
// the guard's own bucket math is unit-tested in inquiry-rate-limit.guard.spec.ts.
test.describe.serial('rate-limit — POST /inquiries enforces 5/min', () => {
  test('the 6th inquiry within the window returns 429', async () => {
    // Unique per run so the in-memory bucket (shared across the whole API
    // process for the job, and persisted when a dev reuses a running server)
    // always starts empty — otherwise a stale bucket can 429 before the 6th
    // request and flake this gate. Isolation is the whole point of the
    // synthetic IP (see _fixtures/api.ts).
    const ip = syntheticIp(`rate-limit-burst-${Date.now()}`);
    const burstSize = 8;
    const status: number[] = [];
    for (let i = 0; i < burstSize; i++) {
      const res = await postInquiry(
        {
          name: 'Throttle Probe',
          email: `qa+throttle-${Date.now()}-${i}@example.com`,
          phone: '+40000000000',
          budget: '50kTo100k',
          message: `Throttle probe number ${i} — exceeding the 5/min limit on purpose.`,
          type: 'general',
          // createInquirySchema requires explicit GDPR consent; without it the
          // payload 400s *after* the rate-limit guard has already counted the
          // hit, so the first 5 come back 400 (not 201) and this gate flakes.
          gdprConsent: true,
        },
        { forwardedFor: ip },
      );
      status.push(res.status);
      if (res.status === 429) break;
    }
    expect(
      status,
      `expected a 429 within ${burstSize} requests; observed: ${status.join(', ')}`,
    ).toContain(429);
    // First 5 must succeed; the throttle should kick in on or before #6.
    expect(status.slice(0, 5).every((s) => s === 201)).toBe(true);
  });
});
