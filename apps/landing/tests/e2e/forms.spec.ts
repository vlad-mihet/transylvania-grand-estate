import { test, expect } from "./fixtures";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

test.describe("D-4 · contact form", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only");
  });

  test("submitting valid input yields a 200 inquiry with X-Site=TGE_LUXURY and source=tge-contact", async ({
    page,
  }) => {
    let inquiryRequest: { headers: Record<string, string>; body: unknown } | null = null;
    page.on("request", async (req) => {
      if (req.method() === "POST" && req.url().includes("/inquiries")) {
        inquiryRequest = {
          headers: req.headers(),
          body: req.postDataJSON() as unknown,
        };
      }
    });

    await page.goto("/ro/contact");
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/Nume|Name|Nom|Vorname/).first().fill("QA Lead");
    await page.getByLabel(/Email|E-mail/).first().fill("qa.lead@example.com");
    // Message textarea is the only <textarea> on the page.
    await page.locator("textarea").first().fill(
      "This is a QA-suite synthetic inquiry — please ignore. Long-enough message to clear the >=10 char Zod rule on the API.",
    );
    await page.getByRole("button", { name: /Trimite|Send|Submit|Envoyer|Senden/i }).click();

    // Success state replaces the form (CheckCircle + success.title text).
    await expect(page.getByText(/Mulțumim|Thank you|Merci|Vielen Dank/i)).toBeVisible({
      timeout: 10_000,
    });

    expect(inquiryRequest, "no POST /inquiries observed").not.toBeNull();
    const req = inquiryRequest!;
    expect(req.headers["x-site"]).toBe("TGE_LUXURY");
    const body = req.body as Record<string, unknown>;
    expect(body.name).toBe("QA Lead");
    expect(body.email).toBe("qa.lead@example.com");
    expect(body.source).toBe("tge-contact");
    expect(body.sourceUrl).toMatch(/\/ro\/contact/);
    expect((body.message as string).length).toBeGreaterThanOrEqual(10);
  });
});

test.describe("D-4 · global inquiry modal [BUG-002 regression]", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "desktop-only");
  });

  test("Request Info modal on a property stamps type, entitySlug, source, sourceUrl", async ({
    page,
  }) => {
    let inquiryRequest: { headers: Record<string, string>; body: unknown } | null = null;
    page.on("request", async (req) => {
      if (req.method() === "POST" && req.url().includes("/inquiries")) {
        inquiryRequest = {
          headers: req.headers(),
          body: req.postDataJSON() as unknown,
        };
      }
    });

    await page.goto("/ro/properties/satmarel-country-estate");
    await page.waitForLoadState("networkidle");

    // First InquiryTrigger on the page is the sticky sidebar's "Request Info".
    await page
      .getByRole("button", { name: /Request|Solicit|Demander|Anfragen/i })
      .first()
      .click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // The modal labels carry stable ids (`inquiry-name`, `inquiry-email`,
    // `inquiry-message`); using them avoids regex collisions on translated
    // label text across locales.
    await dialog.locator("#inquiry-name").fill("QA Modal");
    await dialog.locator("#inquiry-email").fill("qa.modal@example.com");
    await dialog.locator("#inquiry-message").fill(
      "Synthetic QA — modal coverage. Length ≥10. Please ignore.",
    );
    await dialog.getByRole("button", { name: /Trimite|Send|Submit|Envoyer|Senden/i }).click();

    // Success state.
    await expect(dialog.getByText(/Mulțumim|Thank you|Merci|Vielen Dank/i)).toBeVisible({
      timeout: 10_000,
    });

    expect(inquiryRequest).not.toBeNull();
    const body = (inquiryRequest as unknown as { body: Record<string, unknown> }).body;
    expect(body.type).toBe("property");
    expect(body.entitySlug).toBe("satmarel-country-estate");
    // BUG-002 fix: modal now goes through useInquirySubmission which stamps
    // source = `${brand.key}-contact` and sourceUrl from window.location.href.
    expect(body.source).toBe("tge-contact");
    expect(body.sourceUrl).toMatch(/\/ro\/properties\/satmarel-country-estate/);
  });
});

test.describe("D-6 · brand isolation", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "API checks are project-agnostic; run once");
  });

  test("client-side fetch (inquiry submission) carries X-Site=TGE_LUXURY", async ({ page }) => {
    // SSR fetches happen on the Next.js server side and aren't visible to
    // page.on('request'). Drive a real *client-side* call by submitting the
    // contact form, then verify the captured request has the brand header.
    let inquirySite: string | null = null;
    page.on("request", (req) => {
      if (req.method() === "POST" && req.url().includes("/inquiries")) {
        inquirySite = req.headers()["x-site"] ?? null;
      }
    });
    await page.goto("/ro/contact");
    await page.waitForLoadState("networkidle");
    await page.getByLabel(/Nume|Name|Nom/).first().fill("QA Brand");
    await page.getByLabel(/Email|E-mail/).first().fill("qa.brand@example.com");
    await page.locator("textarea").first().fill(
      "Synthetic QA inquiry — please ignore. Confirms X-Site stamping on client-originated submissions.",
    );
    await page.getByRole("button", { name: /Trimite|Send|Submit|Envoyer|Senden/i }).click();
    await expect(page.getByText(/Mulțumim|Thank you|Merci|Vielen Dank/i)).toBeVisible({
      timeout: 10_000,
    });
    expect(inquirySite).toBe("TGE_LUXURY");
  });

  test("API returns disjoint property sets for TGE_LUXURY vs REVERY", async ({
    request,
  }) => {
    // Valid X-Site values per the API's SiteMiddleware: TGE_LUXURY, REVERY,
    // ADMIN, ACADEMY, UNKNOWN. (Confirmed by the API's 400 error message which
    // enumerates them.)
    const luxury = await request.get(`${API_BASE}/properties?limit=100`, {
      headers: { "X-Site": "TGE_LUXURY" },
    });
    expect(luxury.ok()).toBe(true);
    const luxuryJson = (await luxury.json()) as {
      data: { tier?: string; id: string }[];
    };
    expect(luxuryJson.data.length).toBeGreaterThan(0);

    const revery = await request.get(`${API_BASE}/properties?limit=100`, {
      headers: { "X-Site": "REVERY" },
    });
    expect(revery.ok()).toBe(true);
    const reveryJson = (await revery.json()) as {
      data: { tier?: string; id: string }[];
    };

    // Disjoint by id — the hard isolation contract.
    const luxuryIds = new Set(luxuryJson.data.map((p) => p.id));
    for (const p of reveryJson.data) {
      expect(luxuryIds.has(p.id), `Reveria property ${p.id} leaked into TGE result set`).toBe(false);
    }

    // Invalid X-Site is rejected with 400.
    const bogus = await request.get(`${API_BASE}/properties?limit=3`, {
      headers: { "X-Site": "REVERIA_AFFORDABLE" },
    });
    expect(bogus.status()).toBe(400);
  });
});
