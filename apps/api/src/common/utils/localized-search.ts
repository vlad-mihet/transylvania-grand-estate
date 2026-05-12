import { Prisma } from '@prisma/client';
import { locales, type Locale } from '@tge/locale';

/**
 * Build an `OR` array of JSONB-path containment filters that probes every
 * supported locale's slot on a `LocalizedString` column. Replaces ad-hoc
 * `[{ path: ['en'], string_contains: q }, { path: ['ro'], string_contains: q }]`
 * sites that previously failed to surface FR/DE-only content (e.g. a
 * French-translated article with no EN/RO copy was unsearchable until now).
 *
 * Caller composes the result into the appropriate Prisma `where`:
 *   { OR: localizedJsonContainsAny('title', q) }
 *
 * Returns one filter per locale. PostgreSQL's `@>` operator handles each
 * branch independently — no index gymnastics required. If the requesting
 * locale is known, callers can prepend it manually for marginally better
 * planner ordering, but the OR set is order-insensitive at correctness
 * level.
 */
export function localizedJsonContainsAny(
  field: string,
  query: string,
): Prisma.JsonNullableFilter[] {
  return locales.map((locale: Locale) => ({
    path: [locale],
    string_contains: query,
  }));
}
