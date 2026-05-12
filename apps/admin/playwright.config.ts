import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.ADMIN_PORT ?? 3051);
const BASE_URL = process.env.ADMIN_BASE_URL ?? `http://localhost:${PORT}`;

const reuseRunningServer = !process.env.CI;

export const ADMIN_STORAGE_STATE = './.playwright-storage/admin.json';

/**
 * Admin smoke suite. Chromium-only (smoke speed > matrix breadth — Landing
 * already covers the cross-browser matrix). The `setup` project logs in once
 * via the BFF route, persists the resulting `refreshToken` cookie to
 * storageState; every other project loads that storageState so AuthProvider's
 * /api/auth/refresh restores the session on first navigation.
 */
export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: ['**/_fixtures/**'],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 45_000,
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: ADMIN_STORAGE_STATE,
      },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: `${BASE_URL}/ro/login`,
    reuseExistingServer: reuseRunningServer,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
