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
 * that knows REBS field names. It is lossy by design: REBS fields with no
 * canonical home are dropped; nullable canonical fields stay null for the core
 * to default.
 *
 * Returns a skip result (rather than throwing) for listings we deliberately
 * don't import — not for-sale, no price, unmappable type, missing id/city —
 * so the adapter can log and continue the walk.
 */
export type MapResult =
  | { ok: true; listing: CanonicalListingInput }
  | { ok: false; reason: string };

/** REBS `property_type` (free text, Romanian) → our PropertyType enum. */
function mapPropertyType(raw: string | null | undefined): PropertyType | null {
  const t = (raw ?? '').toLowerCase();
  if (!t) return null;
  if (t.includes('apartament') || t.includes('garsonier') || t.includes('apart'))
    return PropertyType.apartment;
  if (t.includes('penthouse')) return PropertyType.penthouse;
  if (t.includes('vil')) return PropertyType.villa;
  if (t.includes('conac') || t.includes('mansion')) return PropertyType.mansion;
  if (t.includes('palat') || t.includes('palace')) return PropertyType.palace;
  if (t.includes('cabana') || t.includes('chalet')) return PropertyType.chalet;
  if (t.includes('teren') || t.includes('lot') || t.includes('terrain'))
    return PropertyType.terrain;
  if (t.includes('casa') || t.includes('casă') || t.includes('house'))
    return PropertyType.house;
  return null;
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
  const externalId = str(raw.internal_id) || str(raw.id);
  if (!externalId) return { ok: false, reason: 'missing internal_id/id' };

  if (!truthy(raw.for_sale)) {
    return { ok: false, reason: `${externalId}: not for sale` };
  }

  const price = num(raw.price_sale);
  if (price == null || price <= 0) {
    return { ok: false, reason: `${externalId}: no sale price` };
  }

  const type = mapPropertyType(raw.property_type);
  if (!type) {
    return {
      ok: false,
      reason: `${externalId}: unmapped property_type "${raw.property_type ?? ''}"`,
    };
  }

  const cityName = str(raw.city);
  if (!cityName) return { ok: false, reason: `${externalId}: no city` };

  const titleRo = str(raw.title) || `${cityName}`;
  const descriptionRo = str(raw.description) || titleRo;
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

    title: ro(titleRo),
    description: ro(descriptionRo),
    shortDescription: ro(truncateForShort(descriptionRo)),
    price,
    currency: (str(raw.currency_sale) || 'EUR').toUpperCase(),
    type,

    city: cityName,
    citySlug: slugify(cityName),
    neighborhood: str(raw.zone) || cityName,
    address: ro(addressRo),
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

function ro(value: string): ImportedLocalizedStringInput {
  return { ro: value };
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
