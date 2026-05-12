import { test, expect } from '@playwright/test';

/**
 * Self-contained tests for the admin BFF auth surface. Each test does its
 * own login so they don't share / mutate refresh-token state across runs.
 * Spread to avoid hitting the 5/60s login throttle on the public auth route
 * — the API enforces a per-IP bucket.
 */
const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL ?? 'admin@transylvaniagrandestate.ro';

function getPassword(): string {
  const p = process.env.SEED_ADMIN_PASSWORD;
  if (!p) throw new Error('SEED_ADMIN_PASSWORD env var required');
  return p;
}

test.describe.configure({ mode: 'serial' });

test.describe('admin auth surface', () => {
  test('BFF login returns accessToken + user', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: ADMIN_EMAIL, password: getPassword() },
    });
    expect(res.ok(), `login failed: ${res.status()} ${await res.text()}`).toBeTruthy();
    const body = (await res.json()) as {
      accessToken: string;
      user: { email: string; role: string };
    };
    expect(body.accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(body.user.email).toBe(ADMIN_EMAIL);
    expect(body.user.role).toBe('SUPER_ADMIN');
  });

  test('BFF refresh mints a fresh access token from the cookie', async ({ request }) => {
    // Login first to seed the refreshToken cookie on this request context.
    const loginRes = await request.post('/api/auth/login', {
      data: { email: ADMIN_EMAIL, password: getPassword() },
    });
    expect(loginRes.ok()).toBeTruthy();

    // Now refresh — the BFF reads the cookie and proxies to NestJS.
    const refreshRes = await request.post('/api/auth/refresh');
    expect(
      refreshRes.ok(),
      `refresh failed: ${refreshRes.status()} ${await refreshRes.text()}`,
    ).toBeTruthy();
    const refreshed = (await refreshRes.json()) as { accessToken?: string };
    expect(refreshed.accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
  });

  test('BFF logout clears the cookie', async ({ request }) => {
    await request.post('/api/auth/login', {
      data: { email: ADMIN_EMAIL, password: getPassword() },
    });
    const logoutRes = await request.post('/api/auth/logout');
    expect(logoutRes.ok()).toBeTruthy();

    // After logout, refresh should fail because the cookie was cleared.
    const refreshAfterLogout = await request.post('/api/auth/refresh');
    expect(refreshAfterLogout.ok()).toBeFalsy();
  });
});
