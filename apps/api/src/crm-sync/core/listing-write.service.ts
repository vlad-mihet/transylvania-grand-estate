import { Injectable, Logger } from '@nestjs/common';
import { Brand, Prisma, PropertyStatus } from '@prisma/client';
import type { CanonicalListingInput } from '@tge/types';
import { PrismaService } from '../../prisma/prisma.service';
import { toJson } from '../../common/utils/prisma-json';
import { BrandRouting } from './brand-route.service';
import {
  ExistingMirror,
  MediaMirrorService,
} from './media-mirror.service';
import {
  backfillLocalized,
  buildListingSlug,
  LocalizedValue,
} from './enrich.util';

export interface PersistOutcome {
  action: 'created' | 'updated';
  quarantined: boolean;
  mediaStats: { downloaded: number; reused: number; failed: number };
}

/**
 * Persists a canonical listing into the Property table (upsert on
 * `source` + `externalId`) and reconciles its mirrored images. This is the
 * only stage that touches the DB.
 *
 * Two product invariants live here:
 *   • Human-owned fields are protected. On UPDATE we refresh content, price,
 *     location, specs, and media — but NEVER `status`, `tier`, `slug`,
 *     `featured`, or `isNew`. A manual `sold` mark or TGE promotion survives.
 *   • Unknown cities are quarantined (imported but `unpublishedAt` set) so a
 *     typo/junk locality can't pollute navigation before an admin approves it.
 */
@Injectable()
export class ListingWriteService {
  private readonly logger = new Logger(ListingWriteService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaMirrorService,
  ) {}

  async persist(
    listing: CanonicalListingInput,
    routing: BrandRouting,
    signal: AbortSignal,
  ): Promise<PersistOutcome> {
    const location = await this.resolveLocation(listing, routing.brand);
    const content = this.buildContent(listing);

    const existing = await this.prisma.property.findUnique({
      where: {
        source_external_id: {
          source: listing.source,
          externalId: listing.externalId,
        },
      },
      select: { id: true },
    });

    const propertyId = existing
      ? await this.update(existing.id, listing, routing, location, content)
      : await this.create(listing, routing, location, content);

    const mediaStats = await this.syncImages(propertyId, listing, signal);

    return {
      action: existing ? 'updated' : 'created',
      quarantined: location.quarantined,
      mediaStats,
    };
  }

  // ── Location resolution + brand membership ──────────────

  private async resolveLocation(
    listing: CanonicalListingInput,
    brand: Brand,
  ): Promise<{
    cityId: string | null;
    lat: number;
    lng: number;
    quarantined: boolean;
  }> {
    const city = await this.prisma.city.findUnique({
      where: { slug: listing.citySlug },
      select: { id: true, latitude: true, longitude: true },
    });

    // Unknown city → quarantine until an admin maps + brand-tags it.
    if (!city) {
      const c = listing.coordinates;
      return {
        cityId: null,
        lat: c?.lat ?? 0,
        lng: c?.lng ?? 0,
        quarantined: true,
      };
    }

    // Known city: ensure REVERY membership so the import is actually visible
    // (a City row existing does NOT imply brand membership).
    await this.ensureCityBrand(city.id, brand);

    // Coordinates: prefer the feed's, fall back to the city centroid. If
    // neither exists we can't place a pin → quarantine (never ship 0,0 live).
    const coords =
      listing.coordinates ??
      (city.latitude != null && city.longitude != null
        ? { lat: city.latitude, lng: city.longitude }
        : null);

    return {
      cityId: city.id,
      lat: coords?.lat ?? 0,
      lng: coords?.lng ?? 0,
      quarantined: coords === null,
    };
  }

  private async ensureCityBrand(cityId: string, brand: Brand): Promise<void> {
    await this.prisma.cityBrand.upsert({
      where: { cityId_brand: { cityId, brand } },
      create: { cityId, brand },
      update: {},
    });
  }

  // ── Content building (localized backfill + defaults) ────

  private buildContent(listing: CanonicalListingInput) {
    const title = backfillLocalized(listing.title);
    const description = backfillLocalized(listing.description);
    const shortDescription = backfillLocalized(listing.shortDescription);
    const address = backfillLocalized(listing.address);

    const features: LocalizedValue[] = [];
    let featurePlaceholder = false;
    for (const f of listing.features) {
      const r = backfillLocalized(f);
      features.push(r.value);
      featurePlaceholder ||= r.placeholderUsed;
    }

    const needsTranslation =
      title.placeholderUsed ||
      description.placeholderUsed ||
      shortDescription.placeholderUsed ||
      address.placeholderUsed ||
      featurePlaceholder;

    return {
      title: title.value,
      description: description.value,
      shortDescription: shortDescription.value,
      address: address.value,
      features,
      needsTranslation,
    };
  }

  private amenityData(
    listing: CanonicalListingInput,
  ): Record<string, boolean> {
    const out: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(listing.amenities)) {
      if (typeof value === 'boolean') out[key] = value;
    }
    return out;
  }

  /** Fields refreshed on BOTH create and update (everything sync-owned). */
  private sharedData(
    listing: CanonicalListingInput,
    routing: BrandRouting,
    location: { cityId: string | null; lat: number; lng: number; quarantined: boolean },
    content: ReturnType<ListingWriteService['buildContent']>,
  ) {
    return {
      title: toJson(content.title),
      description: toJson(content.description),
      shortDescription: toJson(content.shortDescription),
      address: toJson(content.address),
      price: routing.priceEur,
      currency: 'EUR',
      type: listing.type,
      city: listing.city,
      citySlug: listing.citySlug,
      neighborhood: listing.neighborhood,
      latitude: location.lat,
      longitude: location.lng,
      bedrooms: listing.bedrooms ?? 0,
      bathrooms: listing.bathrooms ?? 0,
      area: listing.area ?? 0,
      landArea: listing.landArea ?? null,
      floors: listing.floors ?? 0,
      floor: listing.floor ?? null,
      yearBuilt: listing.yearBuilt ?? 0,
      furnishing: listing.furnishing ?? null,
      material: listing.material ?? null,
      condition: listing.condition ?? null,
      sellerType: listing.sellerType ?? null,
      heating: listing.heating ?? null,
      ownership: listing.ownership ?? null,
      windowType: listing.windowType ?? null,
      ...this.amenityData(listing),
      features: toJson(content.features),
      cityId: location.cityId,
      sourceModifiedAt: listing.sourceModifiedAt,
      needsTranslation: content.needsTranslation,
      // Ingestion-owned: re-publish a known-city listing, (re-)quarantine an
      // unknown-city one. Orthogonal to the human-owned `status` enum.
      unpublishedAt: location.quarantined ? new Date() : null,
    };
  }

  private async create(
    listing: CanonicalListingInput,
    routing: BrandRouting,
    location: { cityId: string | null; lat: number; lng: number; quarantined: boolean },
    content: ReturnType<ListingWriteService['buildContent']>,
  ): Promise<string> {
    const slug = await this.uniqueSlug(listing);
    const created = await this.prisma.property.create({
      data: {
        ...this.sharedData(listing, routing, location, content),
        slug,
        // Insert-only, human-owned thereafter.
        status: PropertyStatus.available,
        tier: routing.tier,
        source: listing.source,
        externalId: listing.externalId,
      },
      select: { id: true },
    });
    return created.id;
  }

  private async update(
    id: string,
    listing: CanonicalListingInput,
    routing: BrandRouting,
    location: { cityId: string | null; lat: number; lng: number; quarantined: boolean },
    content: ReturnType<ListingWriteService['buildContent']>,
  ): Promise<string> {
    await this.prisma.property.update({
      where: { id },
      // Note: status, tier, slug, featured, isNew are intentionally NOT in the
      // update payload — they are human-owned after the first insert.
      data: this.sharedData(listing, routing, location, content),
    });
    return id;
  }

  /**
   * Deterministic slug; only collides with a NATIVE row that happens to share
   * it (the externalId suffix rules out collisions between imported rows). On
   * collision, append a stable short hash so the slug stays deterministic
   * across re-syncs.
   */
  private async uniqueSlug(listing: CanonicalListingInput): Promise<string> {
    const base = buildListingSlug(listing);
    const owner = await this.prisma.property.findUnique({
      where: { slug: base },
      select: { source: true, externalId: true },
    });
    if (
      !owner ||
      (owner.source === listing.source &&
        owner.externalId === listing.externalId)
    ) {
      return base;
    }
    const hash = Math.abs(
      [...`${listing.source}:${listing.externalId}`].reduce(
        (h, ch) => (h * 31 + ch.charCodeAt(0)) | 0,
        0,
      ),
    ).toString(36);
    return `${base}-${hash}`.slice(0, 120);
  }

  // ── Image reconciliation ────────────────────────────────

  private async syncImages(
    propertyId: string,
    listing: CanonicalListingInput,
    signal: AbortSignal,
  ): Promise<PersistOutcome['mediaStats']> {
    // Only CRM-sourced images are sync-managed; admin-added images
    // (source_url = null) are left untouched.
    const existingRows = await this.prisma.propertyImage.findMany({
      where: { propertyId, sourceUrl: { not: null } },
      select: { id: true, sourceUrl: true, storageKey: true, src: true },
    });

    const existing: ExistingMirror[] = existingRows.map((r) => ({
      sourceUrl: r.sourceUrl as string,
      storageKey: r.storageKey,
      src: r.src,
    }));

    const result = await this.media.mirror(listing, existing, signal);

    // Replace the CRM image set: drop the old CRM rows and recreate from the
    // resolved set (reused rows keep their R2 object; obsolete objects are
    // cleaned below). Cheap, and avoids per-row diff bookkeeping.
    const crmRowIds = existingRows.map((r) => r.id);
    await this.prisma.$transaction([
      this.prisma.propertyImage.deleteMany({
        where: { id: { in: crmRowIds } },
      }),
      this.prisma.propertyImage.createMany({
        data: result.rows.map((row) => ({
          propertyId,
          src: row.src,
          alt: toJson(row.alt) as Prisma.InputJsonValue,
          isHero: row.isHero,
          sortOrder: row.sortOrder,
          sourceUrl: row.sourceUrl,
          storageKey: row.storageKey,
        })),
      }),
    ]);

    if (result.obsoleteStorageKeys.length > 0) {
      await this.media.deleteObjects(result.obsoleteStorageKeys);
    }

    return result.stats;
  }
}
