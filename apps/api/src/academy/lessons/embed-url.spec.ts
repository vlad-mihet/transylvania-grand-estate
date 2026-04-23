import {
  lessonEmbedUrlSchema,
  normalizeLessonEmbedUrl,
} from '@tge/types/schemas/_primitives';

/**
 * The embed-URL allowlist is the entire security contract for the
 * academy's video iframe. Regressions here let arbitrary third-party
 * iframes onto the lesson page, so the test covers each accepted shape
 * plus the hostile cases the allowlist is supposed to block.
 */
describe('normalizeLessonEmbedUrl', () => {
  const YT_ID = 'dQw4w9WgXcQ';
  const VIMEO_ID = '123456789';

  it('normalizes youtu.be share URL to nocookie embed', () => {
    expect(normalizeLessonEmbedUrl(`https://youtu.be/${YT_ID}`)).toBe(
      `https://www.youtube-nocookie.com/embed/${YT_ID}`,
    );
  });

  it('normalizes youtube.com/watch?v= to nocookie embed', () => {
    expect(
      normalizeLessonEmbedUrl(`https://www.youtube.com/watch?v=${YT_ID}`),
    ).toBe(`https://www.youtube-nocookie.com/embed/${YT_ID}`);
  });

  it('normalizes youtube.com/embed/ to nocookie embed', () => {
    expect(
      normalizeLessonEmbedUrl(`https://www.youtube.com/embed/${YT_ID}`),
    ).toBe(`https://www.youtube-nocookie.com/embed/${YT_ID}`);
  });

  it('is idempotent for already-canonical youtube-nocookie URLs', () => {
    const canonical = `https://www.youtube-nocookie.com/embed/${YT_ID}`;
    expect(normalizeLessonEmbedUrl(canonical)).toBe(canonical);
  });

  it('normalizes vimeo.com/<id> to player.vimeo', () => {
    expect(normalizeLessonEmbedUrl(`https://vimeo.com/${VIMEO_ID}`)).toBe(
      `https://player.vimeo.com/video/${VIMEO_ID}`,
    );
  });

  it('is idempotent for canonical player.vimeo URLs', () => {
    const canonical = `https://player.vimeo.com/video/${VIMEO_ID}`;
    expect(normalizeLessonEmbedUrl(canonical)).toBe(canonical);
  });

  it('preserves ?start= on YouTube embeds', () => {
    expect(
      normalizeLessonEmbedUrl(
        `https://www.youtube.com/watch?v=${YT_ID}&start=90`,
      ),
    ).toBe(`https://www.youtube-nocookie.com/embed/${YT_ID}?start=90`);
  });

  it('strips tracking params (?si=, ?feature=) from YouTube', () => {
    expect(
      normalizeLessonEmbedUrl(
        `https://youtu.be/${YT_ID}?si=abc123&feature=share`,
      ),
    ).toBe(`https://www.youtube-nocookie.com/embed/${YT_ID}`);
  });

  it('rejects javascript: scheme', () => {
    expect(() =>
      normalizeLessonEmbedUrl('javascript:alert(1)'),
    ).toThrow();
  });

  it('rejects data: scheme', () => {
    expect(() =>
      normalizeLessonEmbedUrl('data:text/html,<script>alert(1)</script>'),
    ).toThrow();
  });

  it('rejects unsupported hosts', () => {
    expect(() =>
      normalizeLessonEmbedUrl('https://evil.com/video/123'),
    ).toThrow(/not allowed/i);
  });

  it('rejects typosquatted youtube-like hosts', () => {
    expect(() =>
      normalizeLessonEmbedUrl(`https://youtub.com/watch?v=${YT_ID}`),
    ).toThrow(/not allowed/i);
  });

  it('rejects malformed YouTube video id', () => {
    expect(() =>
      normalizeLessonEmbedUrl('https://youtu.be/not-an-id-at-all'),
    ).toThrow(/youtube/i);
  });

  it('rejects malformed Vimeo id', () => {
    expect(() =>
      normalizeLessonEmbedUrl('https://vimeo.com/abc'),
    ).toThrow(/vimeo/i);
  });

  it('rejects a non-URL string', () => {
    expect(() => normalizeLessonEmbedUrl('not a url')).toThrow();
  });
});

describe('lessonEmbedUrlSchema', () => {
  const YT_ID = 'dQw4w9WgXcQ';

  it('parses and normalizes valid input', () => {
    expect(lessonEmbedUrlSchema.parse(`https://youtu.be/${YT_ID}`)).toBe(
      `https://www.youtube-nocookie.com/embed/${YT_ID}`,
    );
  });

  it('surfaces rejection as a Zod validation error', () => {
    const result = lessonEmbedUrlSchema.safeParse('https://evil.com/x');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/not allowed/i);
    }
  });
});
