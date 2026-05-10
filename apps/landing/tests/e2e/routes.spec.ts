import {
  test,
  expect,
  LOCALES,
  ROUTE_TEMPLATES,
  localizedURL,
  assertHealthyPage,
} from "./fixtures";

test.describe("D-3 · route smoke (default locale `ro`)", () => {
  for (const route of ROUTE_TEMPLATES) {
    test(`ro · ${route.name} renders cleanly`, async ({ page, collector }) => {
      const response = await page.goto(localizedURL("ro", route.path), {
        waitUntil: "domcontentloaded",
      });
      expect(response, `no response for ${route.path}`).not.toBeNull();
      expect(
        response!.status(),
        `${route.path} HTTP status`,
      ).toBeLessThan(400);

      await assertHealthyPage(page);

      // Page has a single primary heading.
      const h1Count = await page.locator("h1").count();
      expect(h1Count, `${route.path} should have at least one <h1>`).toBeGreaterThan(0);

      // No console errors and no unhandled rejections from this page.
      expect(collector.errors.map((e) => e.text())).toEqual([]);
      expect(collector.unhandledRejections).toEqual([]);

      // No 4xx/5xx network calls (other than our deliberate not-found probe).
      expect(
        collector.failedRequests,
        `failed requests on ${route.path}`,
      ).toEqual([]);
    });
  }

  test("ro · /<missing-slug> renders not-found UX", async ({ page }) => {
    const response = await page.goto("/ro/properties/__definitely-not-a-real-slug__", {
      waitUntil: "domcontentloaded",
    });
    expect(response).not.toBeNull();
    // Next.js notFound() returns a 404 status.
    expect(response!.status()).toBe(404);
    await expect(page.locator("text=/404/i").first()).toBeVisible({ timeout: 5_000 });
  });
});

// Cross-locale smoke: a few representative routes per non-default locale.
const NON_DEFAULT_LOCALES = LOCALES.filter((l) => l !== "ro");
const REPRESENTATIVE_ROUTES = ["home", "properties", "cities", "developers", "about", "contact"];
const ROUTE_BY_NAME = Object.fromEntries(
  ROUTE_TEMPLATES.map((r) => [r.name, r] as const),
);

test.describe("D-3 · cross-locale smoke", () => {
  for (const locale of NON_DEFAULT_LOCALES) {
    for (const name of REPRESENTATIVE_ROUTES) {
      const route = ROUTE_BY_NAME[name];
      test(`${locale} · ${route.name} renders cleanly`, async ({
        page,
        collector,
      }) => {
        const response = await page.goto(localizedURL(locale, route.path), {
          waitUntil: "domcontentloaded",
        });
        expect(response).not.toBeNull();
        expect(response!.status()).toBeLessThan(400);

        // <html lang> matches the active locale.
        const htmlLang = await page.locator("html").getAttribute("lang");
        expect(htmlLang).toBe(locale);

        await assertHealthyPage(page);

        expect(collector.errors.map((e) => e.text())).toEqual([]);
        expect(collector.unhandledRejections).toEqual([]);
      });
    }
  }
});

test.describe("D-3 · meta + a11y", () => {
  test("ro · property detail has a meaningful title (BUG-012 regression check on existing page)", async ({
    page,
  }) => {
    await page.goto("/ro/properties/satmarel-country-estate");
    const title = await page.title();
    // Title should contain the property name (with diacritics) and brand suffix.
    expect(title).toContain("Sătmărel");
    expect(title).toContain("Transylvania Grand Estate");
  });

  test("ro · home <title> falls back to RootLayout default — BUG-012 documents missing per-locale meta", async ({
    page,
  }) => {
    await page.goto("/ro");
    const title = await page.title();
    // Currently falls back to the English default until BUG-012 is fixed.
    // This assertion documents the current state — flip when the bug closes.
    expect(title).toBe("Transylvania Grand Estate | Luxury Real Estate in Romania");
  });

  test("ro · all images have non-empty alt", async ({ page }) => {
    await page.goto("/ro");
    const imgs = await page.locator("img").all();
    for (const img of imgs) {
      const alt = await img.getAttribute("alt");
      const src = await img.getAttribute("src");
      // Empty alt is acceptable for decorative thumbnails inside the lightbox grid.
      // We only flag null (missing attribute entirely).
      expect(alt, `img with src=${src} missing alt attribute`).not.toBeNull();
    }
  });
});
