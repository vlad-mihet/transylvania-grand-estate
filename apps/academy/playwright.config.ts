import { defineConfig, devices } from '@playwright/test';

// Minimal e2e harness for the Academy student portal — chromium-only smoke +
// auth coverage. Academy shipped with zero automated tests and no CI job; this
// suite is the first regression net. Mirrors the revery config's shape.
const PORT = Number(process.env.ACADEMY_PORT ?? 3053);
const BASE_URL = process.env.ACADEMY_BASE_URL ?? `http://localhost:${PORT}`;

const reuseRunningServer = !process.env.CI;

export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: ['**/_fixtures/**'],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 2,
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
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev',
    url: `${BASE_URL}/ro/login`,
    reuseExistingServer: reuseRunningServer,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
