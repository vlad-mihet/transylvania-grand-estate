import type {
  CanonicalListingInput,
  ImportedLocalizedStringInput,
} from '@tge/types';

/**
 * Pure helpers for the enrich stage: turning a (possibly sparse, Romanian-
 * only) canonical listing into the complete, defaulted shape the Property
 * table requires. No I/O — fully unit-testable.
 */

export interface LocalizedValue {
  ro: string;
  en: string;
  fr?: string;
  de?: string;
}

/**
 * URL-safe slug from arbitrary (Romanian) text. Strips diacritics via NFD,
 * lowercases, and collapses anything non-alphanumeric to single dashes.
 * Matches the `slugSchema` charset (`^[a-z0-9-]+$`).
 */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // combining diacritics (ă â î ș ț …)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Deterministic, stable slug for an imported listing:
 *   <city>-<title-or-type>-<externalId>
 * Deterministic so idempotent re-syncs never churn the URL; the externalId
 * suffix guarantees uniqueness across listings without a DB round-trip. Capped
 * at 120 chars (the slugSchema ceiling) by trimming the title segment, never
 * the externalId (which carries the uniqueness).
 */
export function buildListingSlug(listing: CanonicalListingInput): string {
  const idPart = slugify(String(listing.externalId)) || 'x';
  const cityPart = slugify(listing.city);
  const titleSource = listing.title.ro || listing.type;
  const titlePart = slugify(titleSource);

  const suffix = `-${idPart}`;
  const prefix = [cityPart, titlePart].filter(Boolean).join('-');
  const maxPrefix = 120 - suffix.length;
  const trimmedPrefix =
    prefix.length > maxPrefix
      ? prefix.slice(0, maxPrefix).replace(/-+$/g, '')
      : prefix;

  const slug = `${trimmedPrefix}${suffix}`.replace(/^-+/, '');
  // Guard the lower bound (slugSchema requires ≥2 chars).
  return slug.length >= 2 ? slug : `listing-${idPart}`;
}

/**
 * Backfill `en := ro` when the feed gave Romanian only, preserving any locale
 * the feed did supply. Returns the resolved value plus whether a placeholder
 * was substituted (drives the row's `needsTranslation` flag). FR/DE are left
 * empty — the UI falls back to RO.
 */
export function backfillLocalized(imported: ImportedLocalizedStringInput): {
  value: LocalizedValue;
  placeholderUsed: boolean;
} {
  const placeholderUsed = !imported.en || imported.en.trim().length === 0;
  const value: LocalizedValue = {
    ro: imported.ro,
    en: placeholderUsed ? imported.ro : imported.en!,
  };
  if (imported.fr) value.fr = imported.fr;
  if (imported.de) value.de = imported.de;
  return { value, placeholderUsed };
}

/**
 * Derive a short description when the feed lacks a dedicated one: first ~160
 * chars of the (placeholder-resolved) long description, cut on a word boundary.
 */
export function truncateForShort(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
}
