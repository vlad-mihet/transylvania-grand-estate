/**
 * Central React Query key factory for the academy app. Keeping keys in one
 * place means a mutation hook can invalidate `qk.course(slug)` without
 * re-inventing the key shape, and a page can't accidentally use a cousin
 * key that won't get invalidated on the write path.
 */
export const qk = {
  me: () => ["academy", "me"] as const,
  myCourses: (locale: string) => ["academy", "my-courses", locale] as const,
  catalog: (locale: string) => ["academy", "catalog", locale] as const,
  course: (slug: string, locale: string) =>
    ["academy", "course", slug, locale] as const,
  lesson: (slug: string, lessonSlug: string, locale: string) =>
    ["academy", "lesson", slug, lessonSlug, locale] as const,
};
