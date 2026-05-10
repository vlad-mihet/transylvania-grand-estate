import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.REVERY_PORT ?? 3052);
const BASE_URL = process.env.REVERY_BASE_URL ?? `http://localhost:${PORT}`;

const reuseRunningServer = !process.env.CI;

export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: ['**/_fixtures/**'],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 1,
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
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'pnpm dev',
    url: `${BASE_URL}/ro`,
    reuseExistingServer: reuseRunningServer,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
