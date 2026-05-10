import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.LANDING_PORT ?? 3050);
const baseURL = process.env.LANDING_BASE_URL ?? `http://localhost:${PORT}`;
const apiURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

// Reuse a running dev server locally so the suite doesn't churn `next dev`
// every run. CI starts a fresh one — the stricter mode catches startup
// regressions that only surface on cold boot.
const reuseRunningServer = !process.env.CI;

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./tests/e2e/.results",
  reporter: [["list"], ["html", { open: "never", outputFolder: "./tests/e2e/.report" }]],
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: 0,
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: `${baseURL}/en`,
    reuseExistingServer: reuseRunningServer,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
  metadata: { apiURL },
});
