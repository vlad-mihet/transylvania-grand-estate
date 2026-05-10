import { expect, test } from '@playwright/test';
import { LOCALES, type Locale, localePath } from './_fixtures/locale';
import { STATIC_ROUTES } from './_fixtures/routes';
import { findAffordableSlug, findArticleSlug } from './_fixtures/api';

test.describe('seo — head metadata on every static route', () => {
  for (const locale of LOCALES) {
    for (const route of STATIC_ROUTES) {
      test(`${locale} ${route.id} has title + description`, async ({ page }) => {
        await page.goto(route.path(locale as Locale));
        const title = await page.title();
        expect(title.length, `${route.id} title is empty`).toBeGreaterThan(3);
        expect(title, `${route.id} title should reference Revery`).toMatch(/Revery/i);
        const desc = await page.locator('meta[name="description"]').getAttribute('content');
        expect(desc, `${route.id} missing meta description`).not.toBeNull();
        expect(desc!.length, `${route.id} description is empty`).toBeGreaterThan(10);
      });
    }
  }
});

test.describe('seo — robots.txt + sitemap.xml', () => {
  // Dev-mode (no NEXT_PUBLIC_SITE_URL) intentionally returns Disallow: / and
  // <meta robots noindex> — see apps/revery/src/lib/seo.ts:resolveOrigin().
  // The matrix below covers both modes without flagging dev as broken.
  const isCanonical = !!process.env.NEXT_PUBLIC_SITE_URL;

  test('robots.txt → 200', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
    const body = await res.text();
    if (isCanonical) {
      expect(body, 'canonical robots.txt must allow + reference sitemap').toMatch(/Allow:\s*\//);
      expect(body, 'canonical robots.txt missing sitemap line').toMatch(/[Ss]itemap:/);
    } else {
      expect(body, 'dev robots.txt should disallow indexing').toMatch(/Disallow:\s*\//);
    }
  });

  test('sitemap.xml → 200 with key routes', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    const body = await res.text();
    for (const segment of ['/properties', '/cities', '/developers']) {
      expect(body, `sitemap missing ${segment} entries`).toContain(segment);
    }
    expect(body, 'sitemap should declare hreflang alternates').toContain('hreflang=');
  });
});

test.describe('seo — JSON-LD structured data', () => {
  test('home includes Organization or WebSite schema', async ({ page }) => {
    await page.goto(localePath('ro', ''));
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(blocks.length, 'no JSON-LD on home').toBeGreaterThan(0);
    const merged = blocks.join('\n');
    expect(merged).toMatch(/"@type"\s*:\s*"(Organization|WebSite)"/);
  });

  test('property detail includes Product/Residence-flavored schema', async ({ page }) => {
    const slug = await findAffordableSlug();
    await page.goto(localePath('ro', `properties/${slug}`));
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(blocks.length, 'no JSON-LD on property detail').toBeGreaterThan(0);
    const merged = blocks.join('\n');
    // Page emits both quoted-string and array-form `@type` (e.g. ["Product","Accommodation"]).
    expect(merged).toMatch(
      /"@type"\s*:\s*("(RealEstateListing|Product|Residence|Place|Accommodation)"|\[[^\]]*"(Product|RealEstateListing|Residence|Place|Accommodation)"[^\]]*\])/,
    );
  });

  test('blog post includes Article or BlogPosting schema', async ({ page }) => {
    const slug = await findArticleSlug();
    await page.goto(localePath('ro', `blog/${slug}`));
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(blocks.length, 'no JSON-LD on blog post').toBeGreaterThan(0);
    const merged = blocks.join('\n');
    expect(merged).toMatch(/"@type"\s*:\s*"(Article|BlogPosting|NewsArticle)"/);
  });
});

test.describe('seo — Open Graph + Twitter card', () => {
  test('home has og:title + og:type', async ({ page }) => {
    await page.goto(localePath('ro', ''));
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    const ogType = await page.locator('meta[property="og:type"]').getAttribute('content');
    expect(ogTitle, 'home og:title missing').not.toBeNull();
    expect(ogType, 'home og:type missing').not.toBeNull();
  });
});
