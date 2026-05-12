import { test, expect } from '@playwright/test';
import {
  adminApi,
  apiAsBrand,
  getAdminAccessToken,
  uniqueSuffix,
  type ApiEnvelope,
} from './_fixtures/api';

type Agent = {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  email: string;
  active: boolean;
};

const localized = (text: string) => ({ ro: text, en: text });

test.describe('agents CRUD', () => {
  test('create → publish to consumer apps → toggle inactive → delete', async ({
    page,
  }) => {
    const token = getAdminAccessToken();
    const suffix = uniqueSuffix('agent');
    const slug = `qa-agent-${suffix}`;
    const email = `${suffix}@qa.test`;

    // 1. Create.
    const created = await adminApi<ApiEnvelope<Agent>>(token, '/agents', {
      method: 'POST',
      body: {
        slug,
        firstName: 'QA',
        lastName: suffix,
        email,
        phone: '+40700000000',
        bio: localized(`Bio for ${suffix}`),
        active: true,
      },
    });
    const agentId = created.data.id;
    expect(agentId).toBeTruthy();
    expect(created.data.slug).toBe(slug);

    try {
      // 2. Visible on Landing (active=true filter is the consumer default).
      const landing = await apiAsBrand<Agent[]>(
        'TGE_LUXURY',
        `/agents?active=true&limit=100`,
      );
      expect(landing.data.find((a) => a.slug === slug)).toBeDefined();

      // 3. Visible on Revery (agents are cross-brand).
      const revery = await apiAsBrand<Agent[]>(
        'REVERY',
        `/agents?active=true&limit=100`,
      );
      expect(revery.data.find((a) => a.slug === slug)).toBeDefined();

      // 4. Toggle inactive → falls out of consumer default filter.
      await adminApi(token, `/agents/${agentId}`, {
        method: 'PATCH',
        body: { active: false },
      });
      const landingAfter = await apiAsBrand<Agent[]>(
        'TGE_LUXURY',
        `/agents?active=true&limit=100`,
      );
      expect(landingAfter.data.find((a) => a.slug === slug)).toBeUndefined();

      // But still present when consumer asks for inactive.
      const allLanding = await apiAsBrand<Agent[]>(
        'TGE_LUXURY',
        `/agents?active=false&limit=100`,
      );
      expect(allLanding.data.find((a) => a.slug === slug)).toBeDefined();
    } finally {
      // 5. Cleanup.
      await adminApi(token, `/agents/${agentId}`, { method: 'DELETE' }).catch(
        () => undefined,
      );
    }
  });
});
