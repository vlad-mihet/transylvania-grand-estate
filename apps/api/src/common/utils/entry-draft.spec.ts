import { Prisma } from '@prisma/client';
import { applyDraftMode } from './entry-draft';

/**
 * `applyDraftMode` is the single source of truth for the draft/publish split
 * shared by every entry-editor service (Article, Course, Lesson, Property,
 * City, Developer, Agent, Testimonial). The helper is pure — no Prisma client
 * needed — so the contract can be locked here without spinning up Postgres.
 *
 * The behaviors locked by these cases:
 *   - mode "publish" (or undefined for back-compat) writes localized fields
 *     to live and clears the draft column.
 *   - mode "draft" snapshots localized fields into the draft column and
 *     leaves live untouched.
 *   - A metadata-only PATCH (no localized fields in the dto) does NOT clear
 *     the draft on publish — preserves the editor's pending snapshot when
 *     they only nudge a non-localized setting like slug.
 */
describe('applyDraftMode', () => {
  const sampleTitle = { ro: 'Ro Title', en: 'En Title' };
  const sampleExcerpt = { ro: 'Ro Excerpt', en: 'En Excerpt' };
  const sampleContent = { ro: 'Ro Content', en: 'En Content' };

  const localizedFields = ['title', 'excerpt', 'content'] as const;

  it('publishes by default when mode is undefined (back-compat)', () => {
    const result = applyDraftMode(
      { title: sampleTitle, excerpt: sampleExcerpt, content: sampleContent },
      localizedFields,
      undefined,
    );

    expect(result.live.title).toEqual(sampleTitle);
    expect(result.live.excerpt).toEqual(sampleExcerpt);
    expect(result.live.content).toEqual(sampleContent);
    // Localized fields touched → draft is cleared.
    expect(result.draft).toBe(Prisma.JsonNull);
  });

  it('publishes explicitly when mode is "publish"', () => {
    const result = applyDraftMode(
      { title: sampleTitle, excerpt: sampleExcerpt, content: sampleContent },
      localizedFields,
      'publish',
    );

    expect(result.live.title).toEqual(sampleTitle);
    expect(result.live.excerpt).toEqual(sampleExcerpt);
    expect(result.live.content).toEqual(sampleContent);
    expect(result.draft).toBe(Prisma.JsonNull);
  });

  it('snapshots localized fields under draft when mode is "draft"', () => {
    const result = applyDraftMode(
      { title: sampleTitle, excerpt: sampleExcerpt, content: sampleContent },
      localizedFields,
      'draft',
    );

    expect(result.live).toEqual({});
    // Snapshot carries every present localized key.
    expect(result.draft).toEqual({
      title: sampleTitle,
      excerpt: sampleExcerpt,
      content: sampleContent,
    });
  });

  it('snapshots only the localized keys present in the dto', () => {
    const result = applyDraftMode(
      { title: sampleTitle },
      localizedFields,
      'draft',
    );

    expect(result.live).toEqual({});
    // `excerpt` and `content` were not in the dto → not in the snapshot.
    expect(result.draft).toEqual({ title: sampleTitle });
  });

  it('does not snapshot or clear when only non-localized fields are present in draft mode', () => {
    const result = applyDraftMode(
      { slug: 'new-slug' } as { slug: string; title?: never },
      localizedFields,
      'draft',
    );

    expect(result.live).toEqual({});
    // No localized fields touched → no snapshot at all.
    expect(result.draft).toBeUndefined();
  });

  it('does not clear the draft when only non-localized fields are present in publish mode', () => {
    // The contract: a metadata-only PATCH (e.g. just changing slug) should
    // not erase the editor's unsaved-localized-content snapshot. Otherwise
    // a quick slug fix would silently destroy work-in-progress translations.
    const result = applyDraftMode(
      { slug: 'new-slug' } as { slug: string; title?: never },
      localizedFields,
      'publish',
    );

    expect(result.live).toEqual({});
    expect(result.draft).toBeUndefined();
  });
});
