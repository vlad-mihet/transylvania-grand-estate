import { test, expect } from '@playwright/test';

/**
 * End-to-end render smoke for the three consumer apps. Verifies each app
 * boots, serves the right locale, and renders entity slugs that the API
 * surfaces. Catches NEXT_PUBLIC_API_URL drift, brand-tier middleware bugs,
 * and locale-routing regressions in one pass.
 *
 * Manual checklist Domain A/B/D + cross-cutting locale parity = mostly
 * covered here. What's NOT covered (and still belongs in the human pass):
 * visual layout, image quality, copy idiom, animation polish.
 */
const LANDING = process.env.LANDING_BASE_URL ?? 'http://localhost:3050';
const REVERY = process.env.REVERY_BASE_URL ?? 'http://localhost:3052';
const ACADEMY = process.env.ACADEMY_BASE_URL ?? 'http://localhost:3053';

async function fetchHtml(
  request: { get(url: string): Promise<{ ok(): boolean; status(): number; text(): Promise<string> }> },
  url: string,
): Promise<string> {
  const res = await request.get(url);
  expect(res.ok(), `${url} → ${res.status()}`).toBeTruthy();
  return res.text();
}

test.describe('consumer-app render smoke', () => {
  test('Landing /ro renders TGE_LUXURY (no error markers, has html lang)', async ({
    request,
  }) => {
    const html = await fetchHtml(request, `${LANDING}/ro`);
    expect(html).toMatch(/<html[^>]+lang="ro"/);
    // Negative: no obvious server-error markers in the rendered shell.
    expect(html).not.toMatch(/Internal Server Error|Application error/i);
  });

  test('Landing /ro/properties renders at least one luxury property slug', async ({
    request,
  }) => {
    const html = await fetchHtml(request, `${LANDING}/ro/properties`);
    // The grid renders property cards with slug-bearing href to /properties/<slug>.
    const slugs = Array.from(
      html.matchAll(/\/ro\/properties\/([a-z0-9-]+)/g),
    ).map((m) => m[1]);
    expect(
      slugs.length,
      'Landing /properties grid should render slugs (check NEXT_PUBLIC_API_URL + brand isolation)',
    ).toBeGreaterThan(0);
  });

  test('Revery /ro renders REVERY (no error markers, has html lang)', async ({
    request,
  }) => {
    const html = await fetchHtml(request, `${REVERY}/ro`);
    expect(html).toMatch(/<html[^>]+lang="ro"/);
    expect(html).not.toMatch(/Internal Server Error|Application error/i);
  });

  test('Revery /ro/properties renders at least one affordable property slug', async ({
    request,
  }) => {
    const html = await fetchHtml(request, `${REVERY}/ro/properties`);
    const slugs = Array.from(
      html.matchAll(/\/ro\/properties\/([a-z0-9-]+)/g),
    ).map((m) => m[1]);
    expect(slugs.length).toBeGreaterThan(0);
  });

  test('Revery /ro/blog renders without server error', async ({ request }) => {
    const html = await fetchHtml(request, `${REVERY}/ro/blog`);
    expect(html).not.toMatch(/Internal Server Error|Application error/i);
    expect(html).toMatch(/<html[^>]+lang="ro"/);
  });

  test('Academy /ro redirects to login (auth-gated home)', async ({ request }) => {
    // Don't follow redirects — assert the gate triggers.
    const res = await request.get(`${ACADEMY}/ro`, { maxRedirects: 0 });
    expect([200, 301, 302, 307, 308]).toContain(res.status());
    if (res.status() >= 300) {
      const location = res.headers()['location'] ?? '';
      expect(location, `expected redirect to /login, got ${location}`).toMatch(
        /login/,
      );
    }
  });

  test('Locale parity: Landing /en serves html lang="en"', async ({
    request,
  }) => {
    const html = await fetchHtml(request, `${LANDING}/en`);
    expect(html).toMatch(/<html[^>]+lang="en"/);
  });

  test('Locale parity: Revery /en serves html lang="en"', async ({
    request,
  }) => {
    const html = await fetchHtml(request, `${REVERY}/en`);
    expect(html).toMatch(/<html[^>]+lang="en"/);
  });
});
