import { test, expect } from '@playwright/test';
import {
  adminApi,
  findArticleBySlug,
  getAdminAccessToken,
  uniqueSuffix,
  type ApiEnvelope,
} from './_fixtures/api';

type Article = {
  id: string;
  slug: string;
  status: 'draft' | 'published';
  publishedAt?: string | null;
  title: { ro: string; en?: string };
};

const localized = (text: string) => ({ ro: text, en: text });

test.describe('articles publish lifecycle', () => {
  test('create draft → invisible on Revery → publish → visible → unpublish → invisible → delete', async ({
    page,
  }) => {
    const token = getAdminAccessToken();
    const suffix = uniqueSuffix('art');
    const slug = `qa-article-${suffix}`;

    // 1. Create as draft (no status field defaults the API to draft per service logic).
    const created = await adminApi<ApiEnvelope<Article>>(token, '/articles', {
      method: 'POST',
      body: {
        slug,
        title: localized(`QA Article ${suffix}`),
        excerpt: localized(`Excerpt ${suffix}`),
        content: localized(`Body of ${suffix}`),
        coverImage: 'https://picsum.photos/seed/qa/1200/800',
        category: 'guide',
        authorName: 'QA Bot',
      },
    });
    const articleId = created.data.id;

    try {
      // 2. Draft — Revery (REVERY filters status=published by default) does NOT show it.
      const draftOnRevery = await findArticleBySlug('REVERY', slug);
      expect(draftOnRevery, 'draft article leaked to Revery').toBeNull();

      // 3. Publish.
      await adminApi(token, `/articles/${articleId}`, {
        method: 'PATCH',
        body: {
          status: 'published',
          publishedAt: new Date().toISOString(),
          mode: 'publish',
        },
      });

      // 4. Now visible on Revery.
      const publishedOnRevery = await findArticleBySlug('REVERY', slug);
      expect(publishedOnRevery, 'published article missing from Revery').not.toBeNull();
      expect(publishedOnRevery!.status).toBe('published');

      // 5. Unpublish — disappears again.
      await adminApi(token, `/articles/${articleId}`, {
        method: 'PATCH',
        body: { status: 'draft', mode: 'publish' },
      });
      const afterUnpublish = await findArticleBySlug('REVERY', slug);
      expect(afterUnpublish, 'unpublished article still visible').toBeNull();
    } finally {
      // 6. Cleanup.
      await adminApi(token, `/articles/${articleId}`, { method: 'DELETE' }).catch(
        () => undefined,
      );
    }
  });
});
