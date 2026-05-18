import { z } from "zod";

/**
 * Shared schema primitives consumed by every resource schema. Kept in a
 * single module so field-level rules (max length, diacritic-friendly slug
 * regex, locale keys) don't drift between resources.
 */

// Length ceiling for short-form localized strings (titles, excerpts, names,
// addresses, testimonial quotes). 5000 is comfortably above anything a
// reader-facing label needs.
export const LOCALIZED_MAX_LENGTH = 5000;

export const localizedStringSchema = z.object({
  ro: z.string().min(1).max(LOCALIZED_MAX_LENGTH),
  en: z.string().min(1).max(LOCALIZED_MAX_LENGTH),
  fr: z.string().max(LOCALIZED_MAX_LENGTH).optional(),
  de: z.string().max(LOCALIZED_MAX_LENGTH).optional(),
});

export type LocalizedStringInput = z.infer<typeof localizedStringSchema>;

// Length ceiling for long-form localized markdown content (article bodies,
// lesson bodies, course descriptions). 100k chars (~16k words) covers any
// realistic editorial piece with headroom for embedded HTML blocks. The
// admin Tiptap editor enforces a CharacterCount soft limit at the UI layer;
// this Zod cap is the authoritative server-side gate.
export const LOCALIZED_RICH_TEXT_MAX_LENGTH = 100_000;

export const localizedRichTextSchema = z.object({
  ro: z.string().min(1).max(LOCALIZED_RICH_TEXT_MAX_LENGTH),
  en: z.string().min(1).max(LOCALIZED_RICH_TEXT_MAX_LENGTH),
  fr: z.string().max(LOCALIZED_RICH_TEXT_MAX_LENGTH).optional(),
  de: z.string().max(LOCALIZED_RICH_TEXT_MAX_LENGTH).optional(),
});

export type LocalizedRichTextInput = z.infer<typeof localizedRichTextSchema>;

/**
 * Save mode for entry editors with draft + publish support. Optional on the
 * wire — when omitted, the API treats the request as a publish (back-compat
 * with callers that don't know about drafts).
 *
 *   "draft":   localized fields go to the entity's `draft` JSON column,
 *              non-localized fields are written to live as usual; the
 *              published localized values are unchanged.
 *   "publish": localized fields are written to live and any pending draft
 *              is cleared; non-localized fields are written to live.
 */
export const entryModeSchema = z.enum(["draft", "publish"]).optional();
export type EntryMode = z.infer<typeof entryModeSchema>;

/**
 * Brand membership for cities and counties. The two values mirror the
 * `Brand` Prisma enum and the public-site identities (TGE_LUXURY ↔ tge,
 * REVERY ↔ revery). Admin / academy contexts never carry a brand.
 */
export const brandSchema = z.enum(["tge", "revery"]);
export type Brand = z.infer<typeof brandSchema>;

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

// Slugs are URL path segments: lowercase letters, digits, and dashes.
// Min 2 catches typos; max 120 keeps URLs readable.
export const slugSchema = z
  .string()
  .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, digits, or dashes")
  .min(2)
  .max(120);

export const moneyEurSchema = z.coerce.number().nonnegative();

export const coordinatesSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export type CoordinatesInput = z.infer<typeof coordinatesSchema>;

/**
 * Boolean query parameter. `z.coerce.boolean()` treats the string `"false"`
 * as truthy (JS Boolean("false") === true), which is the opposite of what
 * every caller expects. This schema does it safely by matching literal
 * strings — also accepts a raw boolean for JSON bodies.
 */
export const queryBoolSchema = z.union([
  z.boolean(),
  z.enum(["true", "false"]).transform((v) => v === "true"),
]);

/**
 * Shared geo filter — radius search (center + km) and / or map viewport
 * bounding box (sw/ne corners). Query-coerced so numbers can arrive as
 * strings. Mirrors `apps/api/src/common/dto/geo-filter.dto.ts`.
 */
export const geoFilterSchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(0).optional(),
  swLat: z.coerce.number().min(-90).max(90).optional(),
  swLng: z.coerce.number().min(-180).max(180).optional(),
  neLat: z.coerce.number().min(-90).max(90).optional(),
  neLng: z.coerce.number().min(-180).max(180).optional(),
});

/**
 * 18 amenity keys driving the Property boolean columns. Mirrors what used
 * to live in `apps/api/src/properties/dto/property-amenities.dto.ts`.
 */
export const AMENITY_FLAG_KEYS = [
  "hasBalcony",
  "hasTerrace",
  "hasParking",
  "hasGarage",
  "hasSeparateKitchen",
  "hasStorage",
  "hasElevator",
  "hasInteriorStaircase",
  "hasWashingMachine",
  "hasFridge",
  "hasStove",
  "hasOven",
  "hasAC",
  "hasBlinds",
  "hasArmoredDoors",
  "hasIntercom",
  "hasInternet",
  "hasCableTV",
] as const;

export type AmenityFlagKey = (typeof AMENITY_FLAG_KEYS)[number];

/**
 * Plain-boolean amenity shape for JSON bodies (create/update). Matches
 * what admin forms submit and keeps react-hook-form's `useForm<T>` happy
 * (no union/coerced input types).
 */
export const amenityFlagsSchema = z.object(
  Object.fromEntries(
    AMENITY_FLAG_KEYS.map((k) => [k, z.boolean().optional()]),
  ) as Record<AmenityFlagKey, z.ZodOptional<z.ZodBoolean>>,
);

/**
 * Query-string variant that accepts `"true"`/`"false"` (and raw booleans)
 * for filter URLs like `?hasBalcony=true`. Used only in the property
 * list-query schema.
 */
export const amenityQueryFlagsSchema = z.object(
  Object.fromEntries(
    AMENITY_FLAG_KEYS.map((k) => [k, queryBoolSchema.optional()]),
  ) as Record<AmenityFlagKey, z.ZodOptional<typeof queryBoolSchema>>,
);

export type AmenityFlagsInput = z.infer<typeof amenityFlagsSchema>;
export type GeoFilterInput = z.infer<typeof geoFilterSchema>;

/**
 * Embed-URL normalizer for academy video lessons. Accepts the handful of
 * YouTube and Vimeo URL shapes a content editor might paste (share URL,
 * embed URL, privacy-enhanced embed URL) and returns a canonical embed URL.
 *
 * The canonical form always points at a privacy-friendly embed host:
 *   - YouTube -> https://www.youtube-nocookie.com/embed/<id>
 *   - Vimeo   -> https://player.vimeo.com/video/<id>
 *
 * The ?start= query is preserved when present; tracking params (?si=,
 * ?feature=) are stripped. Throws for unsupported hosts or malformed ids.
 * The allowlist is the entire security contract — only these two families
 * are accepted, so the reader-side iframe can be sandboxed with confidence.
 */
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^[0-9]{5,12}$/;

export function normalizeLessonEmbedUrl(raw: string): string {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("Not a valid URL");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    throw new Error("Embed URL must be https");
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const start = u.searchParams.get("start");

  // YouTube family: youtu.be/<id>, youtube.com/watch?v=<id>,
  // youtube.com/embed/<id>, youtube-nocookie.com/embed/<id>.
  if (host === "youtu.be") {
    const id = u.pathname.replace(/^\//, "").split("/")[0];
    if (!YOUTUBE_ID.test(id))
      throw new Error("Not a supported YouTube video id");
    return buildYoutube(id, start);
  }
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (u.pathname === "/watch") {
      const id = u.searchParams.get("v");
      if (!id || !YOUTUBE_ID.test(id))
        throw new Error("Not a supported YouTube video id");
      return buildYoutube(id, start);
    }
    const embedMatch = u.pathname.match(/^\/embed\/([A-Za-z0-9_-]+)/);
    if (embedMatch) {
      const id = embedMatch[1];
      if (!YOUTUBE_ID.test(id))
        throw new Error("Not a supported YouTube video id");
      return buildYoutube(id, start);
    }
    throw new Error("Not a supported YouTube URL shape");
  }

  // Vimeo family: vimeo.com/<id>, player.vimeo.com/video/<id>.
  if (host === "vimeo.com") {
    const id = u.pathname.replace(/^\//, "").split("/")[0];
    if (!VIMEO_ID.test(id)) throw new Error("Not a supported Vimeo video id");
    return buildVimeo(id, start);
  }
  if (host === "player.vimeo.com") {
    const m = u.pathname.match(/^\/video\/([0-9]+)/);
    if (!m) throw new Error("Not a supported Vimeo URL shape");
    const id = m[1];
    if (!VIMEO_ID.test(id)) throw new Error("Not a supported Vimeo video id");
    return buildVimeo(id, start);
  }

  throw new Error("Embed host not allowed — use YouTube or Vimeo");
}

function buildYoutube(id: string, start: string | null): string {
  const base = `https://www.youtube-nocookie.com/embed/${id}`;
  return start && /^\d+$/.test(start) ? `${base}?start=${start}` : base;
}

function buildVimeo(id: string, start: string | null): string {
  const base = `https://player.vimeo.com/video/${id}`;
  return start && /^\d+$/.test(start) ? `${base}#t=${start}s` : base;
}

export const lessonEmbedUrlSchema = z
  .string()
  .url()
  .max(1000)
  .transform((raw, ctx) => {
    try {
      return normalizeLessonEmbedUrl(raw);
    } catch (e) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: (e as Error).message,
      });
      return z.NEVER;
    }
  });
