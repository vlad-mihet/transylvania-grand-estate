import { test as base, expect, type Page, type ConsoleMessage } from "@playwright/test";

export const LOCALES = ["ro", "en", "fr", "de"] as const;
export type Locale = (typeof LOCALES)[number];

// One representative slug per developer template (prestige / atelier / sovereign)
// per `apps/landing/src/app/[locale]/developers/[slug]/template-map.ts`.
export const DEVELOPER_SLUGS = {
  prestige: "verdalis-residence",
  atelier: "carpathia-imobiliare",
  sovereign: "atrium-boutique",
} as const;

// Routes the test matrix iterates. Each entry covers a unique surface; "[slug]"
// placeholders are replaced at iteration time.
export const ROUTE_TEMPLATES = [
  { name: "home", path: "/" },
  { name: "properties", path: "/properties" },
  { name: "property-detail", path: "/properties/satmarel-country-estate" },
  { name: "cities", path: "/cities" },
  { name: "city-detail", path: "/cities/cluj-napoca" },
  { name: "developers", path: "/developers" },
  { name: "developer-prestige", path: `/developers/${DEVELOPER_SLUGS.prestige}` },
  { name: "developer-atelier", path: `/developers/${DEVELOPER_SLUGS.atelier}` },
  { name: "developer-sovereign", path: `/developers/${DEVELOPER_SLUGS.sovereign}` },
  { name: "about", path: "/about" },
  { name: "contact", path: "/contact" },
  { name: "transylvania", path: "/transylvania" },
] as const;

export const localizedURL = (locale: Locale, path: string) =>
  path === "/" ? `/${locale}` : `/${locale}${path}`;

interface ConsoleCollector {
  errors: ConsoleMessage[];
  failedRequests: { url: string; status: number; method: string }[];
  unhandledRejections: string[];
}

export const test = base.extend<{ collector: ConsoleCollector }>({
  collector: async ({ page }, use) => {
    const collector: ConsoleCollector = {
      errors: [],
      failedRequests: [],
      unhandledRejections: [],
    };
    page.on("console", (msg) => {
      if (msg.type() === "error") collector.errors.push(msg);
    });
    page.on("pageerror", (err) => {
      collector.unhandledRejections.push(err.message);
    });
    page.on("response", (res) => {
      const url = res.url();
      // Ignore Next.js dev-server source maps / HMR which can 404 transiently.
      if (url.includes("/_next/") || url.includes(".map")) return;
      if (res.status() >= 400) {
        collector.failedRequests.push({
          url,
          status: res.status(),
          method: res.request().method(),
        });
      }
    });
    await use(collector);
  },
});

export { expect, type Page };

// Assert the page has the basic SEO + a11y shape we expect.
export async function assertHealthyPage(page: Page) {
  // Header + footer present.
  await expect(page.locator("header").first()).toBeVisible();
  await expect(page.locator("footer").first()).toBeVisible();

  // No raw missing-message indicators leaked to the DOM.
  const html = await page.content();
  expect(html).not.toMatch(/Missing message/i);
  expect(html).not.toMatch(/MISSING_MESSAGE/);
  expect(html).not.toMatch(/MISSING_TRANSLATION/);

  // Title is non-empty.
  const title = await page.title();
  expect(title.trim().length).toBeGreaterThan(0);
}
