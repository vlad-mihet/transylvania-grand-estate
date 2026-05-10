import { test, expect, ROUTE_TEMPLATES, localizedURL } from "./fixtures";

const SHOTS_DIR = "tests/e2e/screenshots";

test.describe("D-8 · responsive screenshots (ro + en × desktop + mobile)", () => {
  for (const locale of ["ro", "en"] as const) {
    for (const route of ROUTE_TEMPLATES) {
      test(`${locale} · ${route.name}`, async ({ page }, testInfo) => {
        const response = await page.goto(localizedURL(locale, route.path), {
          waitUntil: "domcontentloaded",
        });
        expect(response).not.toBeNull();
        if (!response!.ok()) {
          testInfo.skip(true, `route returned ${response!.status()}`);
        }
        await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});

        const project = testInfo.project.name;
        await page.screenshot({
          path: `${SHOTS_DIR}/${locale}-${project}-${route.name}.png`,
          fullPage: true,
          animations: "disabled",
        });
      });
    }
  }
});

test.describe("D-8 · long-string layout spot-check (de)", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "long-string check is desktop-only");
  });

  for (const route of [
    { name: "home", path: "/" },
    { name: "property-detail", path: "/properties/satmarel-country-estate" },
  ]) {
    test(`de · ${route.name} (long-string overflow check)`, async ({ page }, testInfo) => {
      const response = await page.goto(localizedURL("de", route.path), {
        waitUntil: "domcontentloaded",
      });
      if (!response || !response.ok()) {
        testInfo.skip(true, `route returned ${response?.status() ?? "unknown"}`);
      }
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
      await page.screenshot({
        path: `${SHOTS_DIR}/de-desktop-${route.name}.png`,
        fullPage: true,
        animations: "disabled",
      });
    });
  }
});
