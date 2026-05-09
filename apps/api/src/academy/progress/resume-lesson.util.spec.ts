import { computeResumeLessonSlug } from './resume-lesson.util';

/**
 * Pure helper used by both student-facing course summaries and the new
 * admin per-enrollment progress endpoint. The semantics here drive the
 * "Continuă →" CTA target, so a regression here would silently send
 * users to the wrong lesson.
 */
describe('computeResumeLessonSlug', () => {
  const lessons = [
    { id: 'l1', slug: 'one' },
    { id: 'l2', slug: 'two' },
    { id: 'l3', slug: 'three' },
  ];

  it('returns null when the course has no published lessons', () => {
    expect(computeResumeLessonSlug([], new Map())).toBeNull();
  });

  it('returns the first lesson when nothing has been opened', () => {
    expect(computeResumeLessonSlug(lessons, new Map())).toBe('one');
  });

  it('returns the first never-opened lesson when prior ones are completed', () => {
    const progress = new Map([
      ['l1', { completedAt: new Date('2026-01-01'), lastSeenAt: new Date('2026-01-01') }],
    ]);
    expect(computeResumeLessonSlug(lessons, progress)).toBe('two');
  });

  it('prefers the most-recent in-progress lesson over a never-opened one', () => {
    const progress = new Map([
      ['l1', { completedAt: new Date('2026-01-01'), lastSeenAt: new Date('2026-01-01') }],
      // l2 is in-progress and seen recently; l3 is never opened — l2 wins.
      ['l2', { completedAt: null, lastSeenAt: new Date('2026-02-01') }],
    ]);
    expect(computeResumeLessonSlug(lessons, progress)).toBe('two');
  });

  it('picks the most-recent in-progress when several are in flight', () => {
    const progress = new Map([
      ['l1', { completedAt: null, lastSeenAt: new Date('2026-01-01') }],
      ['l2', { completedAt: null, lastSeenAt: new Date('2026-03-01') }],
      ['l3', { completedAt: null, lastSeenAt: new Date('2026-02-01') }],
    ]);
    expect(computeResumeLessonSlug(lessons, progress)).toBe('two');
  });

  it('falls back to the first lesson when every lesson is completed', () => {
    const progress = new Map([
      ['l1', { completedAt: new Date('2026-01-01'), lastSeenAt: new Date('2026-01-01') }],
      ['l2', { completedAt: new Date('2026-01-02'), lastSeenAt: new Date('2026-01-02') }],
      ['l3', { completedAt: new Date('2026-01-03'), lastSeenAt: new Date('2026-01-03') }],
    ]);
    expect(computeResumeLessonSlug(lessons, progress)).toBe('one');
  });
});
