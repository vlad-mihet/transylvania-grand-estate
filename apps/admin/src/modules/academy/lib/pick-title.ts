/**
 * Locale-aware fallback for `LocalizedString` fields on academy resources.
 * Order: requested locale → ro (primary) → en → slug. A single call-site so
 * an FR/DE admin doesn't silently see Romanian when a third locale exists.
 */
export function pickTitle(
  title: Record<string, string | undefined> | null | undefined,
  slug: string,
  locale: string,
): string {
  if (!title) return slug;
  return title[locale] ?? title.ro ?? title.en ?? slug;
}
