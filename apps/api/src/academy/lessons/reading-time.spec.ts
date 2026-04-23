import { computeReadingTimeMinutes } from '@tge/types/utils/reading-time';

/**
 * Reading time is served as authoritative lesson metadata — students see
 * it on the dashboard and editors see the same value in the admin list.
 * Behavior needs to be stable across empty content, markdown sugar, and
 * pathological input so dashboards don't flip-flop on content edits.
 */
describe('computeReadingTimeMinutes', () => {
  it('returns 1 for null/undefined/empty content', () => {
    expect(computeReadingTimeMinutes(null)).toBe(1);
    expect(computeReadingTimeMinutes(undefined)).toBe(1);
    expect(computeReadingTimeMinutes('')).toBe(1);
    expect(computeReadingTimeMinutes('   \n\n  ')).toBe(1);
  });

  it('floors at 1 minute even for very short prose', () => {
    expect(computeReadingTimeMinutes('just a handful of words')).toBe(1);
  });

  it('rounds to whole minutes at 200 wpm', () => {
    // 600 words at 200 wpm → 3 min.
    const words = Array.from({ length: 600 }, () => 'word').join(' ');
    expect(computeReadingTimeMinutes(words)).toBe(3);
  });

  it('honors a custom wpm override', () => {
    const words = Array.from({ length: 400 }, () => 'word').join(' ');
    // 400 words at 100 wpm → 4 min.
    expect(computeReadingTimeMinutes(words, 100)).toBe(4);
  });

  it("doesn't count fenced code blocks against reading time", () => {
    const pad = Array.from({ length: 200 }, () => 'word').join(' ');
    const code = '```js\n' + 'x '.repeat(500) + '\n```';
    // Prose contributes ~1 min; code block is stripped so it doesn't
    // balloon the estimate. Upper bound: ~1 min (±1 for slack).
    expect(computeReadingTimeMinutes(`${pad}\n${code}`)).toBeLessThanOrEqual(2);
  });

  it("doesn't count inline-code tokens as extra words", () => {
    const plain = 'the quick brown fox jumps over the lazy dog';
    const withCode = 'the `quick` brown `fox` jumps over the `lazy` dog';
    expect(computeReadingTimeMinutes(plain)).toBe(
      computeReadingTimeMinutes(withCode),
    );
  });

  it('ignores link/image URLs in the word count', () => {
    const plain = 'click here for more information about the topic';
    const withLinks =
      'click [here](https://example.com/very/long/url) for more information ![alt](https://img.example.com/foo.png) about the topic';
    expect(computeReadingTimeMinutes(plain)).toBe(
      computeReadingTimeMinutes(withLinks),
    );
  });

  it('is stable under markdown header/emphasis sugar', () => {
    const plain = 'the quick brown fox jumps over the lazy dog';
    const styled = '# the *quick* **brown** _fox_ jumps\n> over the lazy dog';
    expect(computeReadingTimeMinutes(plain)).toBe(
      computeReadingTimeMinutes(styled),
    );
  });
});
