import { Prisma } from '@prisma/client';
import { toJson } from './prisma-json';

export type EntryMode = 'draft' | 'publish' | undefined;

/**
 * Splits an update DTO into "live" + "draft" writes based on the requested
 * mode. Used by every entry-editor service (Article, Course, Lesson,
 * Property, City, Developer, Agent, Testimonial).
 *
 *   "draft":   localized fields collected from `dto[localizedField]` are
 *              snapshotted under `data.draft`. The localized columns on the
 *              live record are NOT touched.
 *   "publish": localized fields are written to their live columns, and the
 *              `draft` column is set to JsonNull (clears the draft).
 *   undefined: same as "publish" — preserves back-compat with callers that
 *              don't know about drafts.
 *
 * Non-localized fields are always applied to live by the caller; this helper
 * only handles the localized-vs-draft split. Returns a partial update payload
 * that the caller merges into its own Prisma `data` object.
 */
export function applyDraftMode<K extends string>(
  dto: object,
  localizedFields: readonly K[],
  mode: EntryMode,
): {
  live: Partial<Record<K, Prisma.InputJsonValue>>;
  draft: Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined;
} {
  const lookup = dto as Record<string, unknown>;

  if (mode === 'draft') {
    const snapshot: Record<string, unknown> = {};
    for (const field of localizedFields) {
      if (lookup[field] !== undefined) snapshot[field] = lookup[field];
    }
    return {
      live: {},
      draft: Object.keys(snapshot).length > 0 ? toJson(snapshot) : undefined,
    };
  }

  // Publish (or undefined / back-compat path): write localized fields to live
  // and clear any pending draft. We only clear the draft when at least one
  // localized field is present in the dto, so a metadata-only update doesn't
  // surprise users by erasing their unsaved-localized-content snapshot.
  const live: Partial<Record<K, Prisma.InputJsonValue>> = {};
  let touchedLocalized = false;
  for (const field of localizedFields) {
    if (lookup[field] !== undefined) {
      live[field] = toJson(lookup[field]);
      touchedLocalized = true;
    }
  }
  return {
    live,
    draft: touchedLocalized ? Prisma.JsonNull : undefined,
  };
}
