import { z } from "zod";
import {
  PropertyType,
  Furnishing,
  ConstructionMaterial,
  PropertyCondition,
  SellerType,
  HeatingType,
  OwnershipType,
  WindowType,
} from "@prisma/client";
import {
  amenityFlagsSchema,
  coordinatesSchema,
  LOCALIZED_MAX_LENGTH,
  LOCALIZED_RICH_TEXT_MAX_LENGTH,
  slugSchema,
} from "./_primitives";

/**
 * Canonical CRM listing contract — the load-bearing wall between the
 * CRM-agnostic sync core and any per-CRM adapter.
 *
 * It is derived TOP-DOWN from our `Property` domain, never from a CRM's
 * fields. An adapter's only job is a lossy map from its blob into this shape;
 * the core depends solely on this contract. If this model ever grows a field
 * "because REBS has it," the boundary has failed.
 *
 * Three deliberate differences from the Property create schema:
 *   1. `status`, `tier`, and `brand` are ABSENT. They are policy outputs of
 *      the core brand-route stage (price threshold + city membership), not
 *      source data.
 *   2. Localized strings are RO-required / EN-optional (see
 *      `importedLocalizedStringSchema`) — CRM feeds are single-language
 *      (Romanian). The persist stage backfills `en := ro` + flags
 *      `needsTranslation`; we never weaken the human-authored
 *      `localizedStringSchema` (which requires both ro + en).
 *   3. Specs that a CRM may omit (coordinates, bedrooms, area, yearBuilt…) are
 *      NULLABLE here so the core pipeline — not the adapter — owns defaulting.
 */

/**
 * Sources we can import from. Grows by exactly one entry per new adapter.
 * Mirrors the (free-text) `Property.source` column; kept an enum here so the
 * core/orchestrator branches on a closed set.
 */
export const crmSourceSchema = z.enum(["rebs"]);
export type CrmSource = z.infer<typeof crmSourceSchema>;

/**
 * RO-required, EN/FR/DE optional. The import-time counterpart to
 * `localizedStringSchema`. CRM descriptions/titles/addresses are Romanian
 * only; English is a placeholder backfilled at persist time, not source data.
 */
export const importedLocalizedStringSchema = z.object({
  ro: z.string().min(1).max(LOCALIZED_MAX_LENGTH),
  en: z.string().max(LOCALIZED_MAX_LENGTH).optional(),
  fr: z.string().max(LOCALIZED_MAX_LENGTH).optional(),
  de: z.string().max(LOCALIZED_MAX_LENGTH).optional(),
});
export type ImportedLocalizedStringInput = z.infer<
  typeof importedLocalizedStringSchema
>;

/** Long-form variant for descriptions (markdown / multi-paragraph bodies). */
export const importedLocalizedRichTextSchema = z.object({
  ro: z.string().min(1).max(LOCALIZED_RICH_TEXT_MAX_LENGTH),
  en: z.string().max(LOCALIZED_RICH_TEXT_MAX_LENGTH).optional(),
  fr: z.string().max(LOCALIZED_RICH_TEXT_MAX_LENGTH).optional(),
  de: z.string().max(LOCALIZED_RICH_TEXT_MAX_LENGTH).optional(),
});

/**
 * A single image reference, pre-mirroring. `sourceUrl` is the CRM's URL
 * (hotlinking is forbidden — the media-mirror stage downloads and self-hosts
 * it). `isHero`/`sortOrder` are the adapter's best ordering hint.
 */
export const canonicalImageSchema = z.object({
  sourceUrl: z.string().url(),
  alt: importedLocalizedStringSchema.optional(),
  isHero: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).default(0),
});
export type CanonicalImageInput = z.infer<typeof canonicalImageSchema>;

export const canonicalListingSchema = z.object({
  // ── Identity / provenance ──────────────────────────────
  source: crmSourceSchema,
  externalId: z.string().min(1),
  // CRM's last-modified ts. Nullable: not every feed exposes one.
  sourceModifiedAt: z.coerce.date().nullable(),
  // Canonical listing URL on the CRM (audit / future back-link).
  sourceUrl: z.string().url().optional(),

  // ── Core domain ────────────────────────────────────────
  title: importedLocalizedStringSchema,
  description: importedLocalizedRichTextSchema,
  shortDescription: importedLocalizedStringSchema,
  // Price + currency are carried in the SOURCE currency. The core
  // brand-route stage converts RON→EUR before applying the tier threshold and
  // before persisting (we store EUR). Keeping conversion in core means the
  // adapter never needs the FX rate.
  price: z.coerce.number().min(0),
  currency: z.string().min(3).max(10),
  type: z.nativeEnum(PropertyType),

  // ── Location ───────────────────────────────────────────
  city: z.string().min(1).max(120),
  citySlug: slugSchema,
  neighborhood: z.string().min(1).max(120),
  address: importedLocalizedStringSchema,
  // Nullable → defaulted to the resolved City centroid by the enrich stage.
  coordinates: coordinatesSchema.nullable(),

  // ── Specs (nullable; defaulted in core) ────────────────
  bedrooms: z.coerce.number().int().min(0).nullable(),
  bathrooms: z.coerce.number().int().min(0).nullable(),
  area: z.coerce.number().min(0).nullable(),
  landArea: z.coerce.number().min(0).optional(),
  floors: z.coerce.number().int().min(0).nullable(),
  floor: z.coerce.number().int().optional(),
  yearBuilt: z.coerce.number().int().nullable(),

  // ── Optional classification (CRM may not supply) ───────
  // The adapter maps to these enums only when it can; otherwise omit. Core
  // persists them verbatim, so they must already be valid domain values.
  furnishing: z.nativeEnum(Furnishing).optional(),
  material: z.nativeEnum(ConstructionMaterial).optional(),
  condition: z.nativeEnum(PropertyCondition).optional(),
  heating: z.nativeEnum(HeatingType).optional(),
  ownership: z.nativeEnum(OwnershipType).optional(),
  windowType: z.nativeEnum(WindowType).optional(),
  sellerType: z.nativeEnum(SellerType).optional(),

  // The 18 boolean amenity flags the CRM can express (all optional).
  amenities: amenityFlagsSchema,
  features: z.array(importedLocalizedStringSchema).default([]),
  images: z.array(canonicalImageSchema).default([]),
});

export type CanonicalListingInput = z.infer<typeof canonicalListingSchema>;
