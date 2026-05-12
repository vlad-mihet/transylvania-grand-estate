import { defaultLocale, isLocale, type Locale } from "./constants";

interface RankedTag {
  /** Primary subtag, lowercased (e.g. `"en"` from `"en-GB"`). */
  tag: string;
  /** Quality value (0..1). Defaults to 1 when absent. */
  quality: number;
}

/**
 * Parse an HTTP `Accept-Language` header into ranked language tags.
 * Quality-value (`;q=`) aware. Only the primary subtag is returned —
 * we don't carry full BCP-47 because our supported locales are
 * 2-letter codes; region-qualified preferences collapse to the same
 * primary.
 *
 * Invalid entries are silently dropped. An empty/missing header yields
 * an empty list — caller falls back to `defaultLocale`.
 */
export function parseAcceptLanguage(
  header: string | null | undefined,
): RankedTag[] {
  if (!header) return [];
  const entries: RankedTag[] = [];
  for (const raw of header.split(",")) {
    const part = raw.trim();
    if (!part) continue;
    const [tagPart, ...params] = part.split(";");
    if (!tagPart) continue;
    const primary = tagPart.split("-")[0]?.trim().toLowerCase();
    if (!primary || primary === "*") continue;
    let quality = 1;
    for (const param of params) {
      const [k, v] = param.split("=").map((s) => s.trim());
      if (k === "q" && v) {
        const parsed = Number.parseFloat(v);
        if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) {
          quality = parsed;
        }
      }
    }
    if (quality === 0) continue;
    entries.push({ tag: primary, quality });
  }
  // Stable sort by quality descending. The browser preserves insertion
  // order for ties, which already matches user intent.
  entries.sort((a, b) => b.quality - a.quality);
  return entries;
}

/**
 * Pick the best-matching supported `Locale` from an `Accept-Language`
 * header. Walks ranked tags in order, returning the first that matches
 * a supported locale's primary subtag. Falls back to `fallback`
 * (default `defaultLocale`) when nothing matches.
 *
 * Use this on the unprefixed-root redirect path; once the URL carries
 * an explicit locale prefix, the URL is authoritative — don't call
 * this on every request.
 */
export function negotiateLocale(
  acceptLanguage: string | null | undefined,
  fallback: Locale = defaultLocale,
): Locale {
  const ranked = parseAcceptLanguage(acceptLanguage);
  for (const { tag } of ranked) {
    if (isLocale(tag)) return tag;
  }
  return fallback;
}
