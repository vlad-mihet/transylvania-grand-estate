import { PropertyType } from '@prisma/client';
import type {
  CanonicalImageInput,
  CanonicalListingInput,
  ImportedLocalizedStringInput,
} from '@tge/types';
import { slugify, truncateForShort } from '../../core/enrich.util';
import { RebsProperty } from './rebs.types';

/**
 * Maps a raw REBS property into the canonical model. This is the ONLY file
 * that knows REBS field names + code tables. It is lossy by design: REBS fields
 * with no canonical home are dropped; nullable canonical fields stay null for
 * the core to default.
 *
 * Returns a skip result (rather than throwing) for listings we deliberately
 * don't import — not for-sale, no price, unsupported currency, non-residential
 * type, missing id/city — so the adapter can log and continue the walk.
 *
 * Code tables verified against https://demo.crmrebs.com/api/doc/ + live demo data.
 */
export type MapResult =
  | { ok: true; listing: CanonicalListingInput }
  | { ok: false; reason: string };

/**
 * REBS numeric `property_type` → our PropertyType. REBS codes:
 *   1 Apartment · 3 House/Villa · 4 Office · 5 Commercial · 6 Land ·
 *   7 Industrial · 8 Hotel/Guesthouse · 9 Special.   (No code 2 in REBS.)
 * Only residential + land map onto our enum; office/commercial/industrial/
 * hotel/special have no home here and are skipped (logged) — out of scope for
 * the REVERY/affordable brand in Phase 1.
 */
const REBS_PROPERTY_TYPE: Record<number, PropertyType> = {
  1: PropertyType.apartment,
  3: PropertyType.house,
  6: PropertyType.terrain,
};

/** REBS numeric `currency_sale` → ISO. We price in EUR and convert RON; USD (3)
 * and any other code are out of scope and skipped. */
const REBS_CURRENCY: Record<number, string> = {
  1: 'EUR',
  2: 'RON',
};

function mapPropertyType(raw: unknown): PropertyType | null {
  const code = Number(raw);
  if (!Number.isInteger(code)) return null;
  return REBS_PROPERTY_TYPE[code] ?? null;
}

function mapCurrency(raw: unknown): string | null {
  const code = Number(raw);
  if (!Number.isInteger(code)) return null;
  return REBS_CURRENCY[code] ?? null;
}

/** REBS tag (Romanian) → amenity boolean key. Unmatched tags become features. */
const TAG_AMENITY_MAP: Array<[RegExp, string]> = [
  [/balcon/i, 'hasBalcony'],
  [/teras/i, 'hasTerrace'],
  [/parcare/i, 'hasParking'],
  [/garaj/i, 'hasGarage'],
  [/bucat.+separat|buc.+separat/i, 'hasSeparateKitchen'],
  [/boxa|boxă|depozitare/i, 'hasStorage'],
  [/lift/i, 'hasElevator'],
  [/scar.+interioar/i, 'hasInteriorStaircase'],
  [/masin.+de.+spalat|mașin.+de.+spălat/i, 'hasWashingMachine'],
  [/frigider/i, 'hasFridge'],
  [/aragaz|plit/i, 'hasStove'],
  [/cuptor/i, 'hasOven'],
  [/aer.+condi|clima|a\/c/i, 'hasAC'],
  [/jaluzel|rulou/i, 'hasBlinds'],
  [/usa.+metal|ușă.+metal|blindat/i, 'hasArmoredDoors'],
  [/interfon|videointerfon/i, 'hasIntercom'],
  [/internet|fibra|fibră/i, 'hasInternet'],
  [/cablu|tv|televiziune/i, 'hasCableTV'],
];

export function mapRebsProperty(raw: RebsProperty): MapResult {
  // REBS `internal_id` is frequently empty in practice; fall back to the
  // numeric `id` (stable) so the (source, externalId) key is always populated.
  const externalId = str(raw.internal_id) || str(raw.id);
  if (!externalId) return { ok: false, reason: 'missing internal_id/id' };

  if (!truthy(raw.for_sale)) {
    return { ok: false, reason: `${externalId}: not for sale` };
  }

  const price = num(raw.price_sale);
  if (price == null || price <= 0) {
    return { ok: false, reason: `${externalId}: no sale price` };
  }

  const currency = mapCurrency(raw.currency_sale);
  if (!currency) {
    return {
      ok: false,
      reason: `${externalId}: unsupported currency_sale code "${raw.currency_sale}"`,
    };
  }

  const type = mapPropertyType(raw.property_type);
  if (!type) {
    return {
      ok: false,
      reason: `${externalId}: non-residential/unmapped property_type "${raw.property_type}"`,
    };
  }

  const cityName = str(raw.city);
  if (!cityName) return { ok: false, reason: `${externalId}: no city` };

  const titleRo = str(raw.title) || cityName;
  const descriptionRo = str(raw.description) || titleRo;
  const descriptionEn = str(raw.description_en);
  const addressRo =
    [str(raw.street), str(raw.location_number), str(raw.zone), cityName]
      .filter(Boolean)
      .join(', ') || cityName;

  const lat = num(raw.lat);
  const lng = num(raw.lng);
  const coordinates =
    lat != null && lng != null && (lat !== 0 || lng !== 0)
      ? { lat, lng }
      : null;

  const { amenities, features } = mapTags(raw);

  const listing: CanonicalListingInput = {
    source: 'rebs',
    externalId,
    sourceModifiedAt: parseDate(raw.date_modified),

    // English: our live instance's schema only exposes tags_en/nearby_en —
    // title_en/description_en are NOT in it (verified against
    // /api/public/property/schema/, 2026-07-05), so today these stay RO-only
    // and the core flags `needsTranslation`. Kept as forward-compat: REBS
    // exports extra fields on request, and `loc()` no-ops when absent.
    title: loc(titleRo, raw.title_en),
    description: loc(descriptionRo, raw.description_en),
    shortDescription: loc(
      truncateForShort(descriptionRo),
      descriptionEn ? truncateForShort(descriptionEn) : undefined,
    ),
    price,
    currency,
    type,

    city: cityName,
    citySlug: slugify(cityName),
    neighborhood: str(raw.zone) || cityName,
    address: loc(addressRo), // REBS has no address_en
    coordinates,

    bedrooms: num(raw.bedrooms) ?? num(raw.rooms) ?? null,
    bathrooms: num(raw.bathrooms) ?? null,
    area: num(raw.surface_total) ?? null,
    landArea: num(raw.surface_land) ?? undefined,
    floors: null,
    floor: num(raw.floor) ?? undefined,
    yearBuilt: num(raw.building_construction_year) ?? null,

    amenities,
    features,
    images: mapImages(raw),
  };

  return { ok: true, listing };
}

// ── helpers ───────────────────────────────────────────────

/** Build a localized value, attaching `en` only when REBS supplied it. */
function loc(ro: string, en?: unknown): ImportedLocalizedStringInput {
  const out: ImportedLocalizedStringInput = { ro };
  const e = str(en);
  if (e) out.en = e;
  return out;
}

function str(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

function num(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function truthy(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return ['1', 'true', 'yes', 'da'].includes(v.toLowerCase());
  return false;
}

function parseDate(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function mapTags(raw: RebsProperty): {
  amenities: Record<string, boolean>;
  features: ImportedLocalizedStringInput[];
} {
  const amenities: Record<string, boolean> = {};
  const features: ImportedLocalizedStringInput[] = [];
  const tags = raw.tags ?? [];
  const tagsEn = raw.tags_en ?? [];

  tags.forEach((tag, i) => {
    const match = TAG_AMENITY_MAP.find(([re]) => re.test(tag));
    if (match) {
      amenities[match[1]] = true;
    } else {
      const en = tagsEn[i];
      features.push(en ? { ro: tag, en } : { ro: tag });
    }
  });

  // `nearby` / `nearby_en` is the one RO+EN pair REBS gives us — fold into features.
  const nearby = Array.isArray(raw.nearby) ? raw.nearby : [str(raw.nearby)];
  const nearbyEn = Array.isArray(raw.nearby_en)
    ? raw.nearby_en
    : [str(raw.nearby_en)];
  nearby.filter(Boolean).forEach((n, i) => {
    const en = nearbyEn[i];
    features.push(en ? { ro: n, en } : { ro: n });
  });

  return { amenities, features };
}

/** Extract a URL from a REBS image entry (string, or object with a url field). */
function imageUrl(entry: unknown): string | null {
  if (typeof entry === 'string') return entry.trim() || null;
  if (entry && typeof entry === 'object') {
    const o = entry as Record<string, unknown>;
    const candidate = o.url ?? o.full ?? o.image ?? o.src ?? o.href;
    if (typeof candidate === 'string') return candidate.trim() || null;
  }
  return null;
}

function mapImages(raw: RebsProperty): CanonicalImageInput[] {
  const images: CanonicalImageInput[] = [];
  const seen = new Set<string>();
  let order = 0;

  const push = (entry: unknown, isHero: boolean) => {
    const url = imageUrl(entry);
    if (!url || seen.has(url) || !/^https?:\/\//i.test(url)) return;
    seen.add(url);
    images.push({ sourceUrl: url, isHero, sortOrder: order++ });
  };

  // Hero: explicit thumbnail if present, else the first full image.
  const thumb = imageUrl(raw.thumbnail);
  const fulls = raw.full_images ?? raw.resized_images ?? [];
  if (thumb) push(thumb, true);
  fulls.forEach((entry) => push(entry, !thumb && images.length === 0));

  // Floor-plan sketches trail real photos.
  (raw.sketches ?? []).forEach((entry) => push(entry, false));

  return images;
}
