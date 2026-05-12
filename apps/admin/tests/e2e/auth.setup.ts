import { test as setup, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const STORAGE_DIR = './.playwright-storage';
const TOKEN_PATH = `${STORAGE_DIR}/admin-tokens.json`;
const STORAGE_STATE_PATH = `${STORAGE_DIR}/admin.json`;
const API_URL = process.env.ADMIN_API_URL ?? 'http://localhost:4000/api/v1';

/**
 * Logs in once as the seeded super-admin and persists:
 *   1. The raw `accessToken` to admin-tokens.json (15-min JWT, plenty for a
 *      full test run). Specs read this synchronously via getAdminAccessToken().
 *   2. The refreshToken cookie to storageState — used only by auth.spec.ts
 *      navigation tests that need a logged-in browser.
 *
 * Why not call /api/auth/refresh per test? The API rotates refresh tokens
 * single-use (auth.service.ts: prior jti revoked on rotation). Each spec
 * loading the same storageState cookie burns the same v1 jti → second spec
 * sees "Refresh token has been revoked" → 401. Caching a raw access token
 * sidesteps the entire rotation dance.
 *
 * Required env: SEED_ADMIN_PASSWORD (matching the value passed to the seed).
 */
setup('authenticate as super-admin', async ({ request }) => {
  const email =
    process.env.ADMIN_EMAIL ?? 'admin@transylvaniagrandestate.ro';
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!password) {
    throw new Error(
      'SEED_ADMIN_PASSWORD env var is required for admin e2e tests. ' +
        'Run: SEED_ADMIN_PASSWORD=<value> pnpm --filter @tge/admin test:e2e',
    );
  }

  // Hit NestJS directly so we get accessToken + refreshToken in the body
  // (the admin BFF strips refreshToken into a cookie before responding).
  const res = await request.post(`${API_URL}/auth/login`, {
    data: { email, password },
  });

  expect(
    res.ok(),
    `Admin login failed (${res.status()}): ${await res.text()}`,
  ).toBeTruthy();

  const body = (await res.json()) as {
    success: boolean;
    data: {
      accessToken: string;
      refreshToken: string;
      user: { id: string; email: string; role: string };
    };
  };
  const { accessToken, user } = body.data;
  expect(user.email).toBe(email);
  expect(user.role).toBe('SUPER_ADMIN');

  fs.mkdirSync(STORAGE_DIR, { recursive: true });
  fs.writeFileSync(
    TOKEN_PATH,
    JSON.stringify({ accessToken, user, mintedAt: Date.now() }, null, 2),
  );

  // Also persist a storageState the auth.spec.ts navigation tests can use.
  // Each navigation test that needs it does its own /api/auth/login through
  // the BFF — this storageState is just a "logged-in" baseline marker.
  await request.storageState({ path: STORAGE_STATE_PATH });
});
