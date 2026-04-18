import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, PropertyStatus, PropertyTier } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { QueryPropertyDto } from './dto/query-property.dto';
import { UpdatePropertyImageDto } from './dto/update-property-image.dto';
import { paginate } from '../common/utils/pagination.util';
import { ensureFound } from '../common/utils/ensure-found.util';
import { ensureRef } from '../common/utils/ensure-ref.util';
import { ensureSlugUnique } from '../common/utils/ensure-slug-unique.util';
import { toJson } from '../common/utils/prisma-json';
import { SITE_TIER_SCOPE, SiteContext } from '../common/site';
import { amenityFlagsSchema } from '@tge/types/schemas/_primitives';

// Derive the 18 amenity keys from the shared Zod schema so this stays in
// lockstep with `CreatePropertyDto` / `UpdatePropertyDto`. If a new flag is
// added to `amenityFlagsSchema`, it automatically appears here.
const AMENITY_KEYS = Object.keys(amenityFlagsSchema.shape) as Array<
  keyof typeof amenityFlagsSchema.shape
>;
type AmenityKey = (typeof AMENITY_KEYS)[number];

@Injectable()
export class PropertiesService {
  private readonly logger = new Logger(PropertiesService.name);

  constructor(
    private prisma: PrismaService,
    private uploadsService: UploadsService,
  ) {}

  private buildWhereClause(
    query: QueryPropertyDto,
    site: SiteContext,
  ): Prisma.PropertyWhereInput {
    const where: Prisma.PropertyWhereInput = {};
    this.applyScopeFilters(where, query, site);
    this.applyRangeFilters(where, query);
    this.applyClassificationFilters(where, query);
    this.applyAmenityFilters(where, query);
    this.applyRecencyFilters(where, query);
    this.applyGeoFilters(where, query);
    this.applySearchFilter(where, query);
    return where;
  }

  /** Scope + foreign-key-style filters: city, county, type, status, tier, etc. */
  private applyScopeFilters(
    where: Prisma.PropertyWhereInput,
    q: QueryPropertyDto,
    site: SiteContext,
  ) {
    // City now filters via the FK relation (`cityRef.slug`) instead of the
    // denormalized `citySlug` column. Requires `cityId` to be backfilled for
    // historical rows — see `prisma/backfill-city-county-ids.sql`.
    // County stays on `countySlug` for now: Property has no direct FK to
    // County (it reaches County only through City), and collapsing the join
    // would add a second hop per query. Deferred to a follow-up.
    if (q.city) where.cityRef = { slug: q.city };
    if (q.county) where.countySlug = q.county;
    if (q.type) where.type = q.type;
    if (q.status) where.status = q.status;
    this.applyTierScope(where, q, site);
    if (q.featured !== undefined) where.featured = q.featured;
    if (q.isNew !== undefined) where.isNew = q.isNew;
    if (q.developerId) where.developerId = q.developerId;
    if (q.agentId) where.agentId = q.agentId;
  }

  /**
   * Server-enforced brand isolation: a site pinned to a tier cannot widen its
   * view by sending `tier=...` from the client. Admin origins may pass through
   * the query filter. Unknown origins are clamped to an impossible tier so
   * results are empty rather than leaking which tiers exist.
   */
  private applyTierScope(
    where: Prisma.PropertyWhereInput,
    q: QueryPropertyDto,
    site: SiteContext,
  ) {
    const scope = SITE_TIER_SCOPE[site.id];
    if (scope === null) {
      if (q.tier) where.tier = q.tier;
      return;
    }
    if (scope.length === 0) {
      where.tier = { in: [] };
      return;
    }
    where.tier = scope.length === 1 ? scope[0] : { in: scope };
  }

  /** Numeric ranges: price, bedrooms, bathrooms, area, floor, year built. */
  private applyRangeFilters(
    where: Prisma.PropertyWhereInput,
    q: QueryPropertyDto,
  ) {
    if (q.minPrice || q.maxPrice) {
      where.price = {};
      if (q.minPrice) where.price.gte = q.minPrice;
      if (q.maxPrice) where.price.lte = q.maxPrice;
    }

    this.applyBedroomFilter(where, q);

    if (q.minBathrooms || q.maxBathrooms) {
      where.bathrooms = {};
      if (q.minBathrooms) where.bathrooms.gte = q.minBathrooms;
      if (q.maxBathrooms) where.bathrooms.lte = q.maxBathrooms;
    }

    if (q.minArea || q.maxArea) {
      where.area = {};
      if (q.minArea) where.area.gte = q.minArea;
      if (q.maxArea) where.area.lte = q.maxArea;
    }

    if (q.minFloor || q.maxFloor) {
      where.floor = {};
      if (q.minFloor) where.floor.gte = q.minFloor;
      if (q.maxFloor) where.floor.lte = q.maxFloor;
    }

    if (q.minYearBuilt || q.maxYearBuilt) {
      where.yearBuilt = {};
      if (q.minYearBuilt) where.yearBuilt.gte = q.minYearBuilt;
      if (q.maxYearBuilt) where.yearBuilt.lte = q.maxYearBuilt;
    }
  }

  /**
   * Bedroom filter. The client's room-toggle UI lets the user pick any
   * combination of exact values (1..5) plus an open-ended "6+" bucket. Exact
   * picks arrive as `bedrooms=[…]`; the 6+ bucket is expressed via the
   * existing `minBedrooms`. When both are set we OR them so a selection like
   * {2, 6+} matches rooms === 2 OR rooms >= 6. `maxBedrooms` complements
   * `minBedrooms` for callers expressing a plain numeric range (admin list,
   * external integrations) — ignored when the 6+ UX is in play because the
   * exact multiselect already bounds the set. Wrapped in `AND` so it doesn't
   * collide with the search filter's top-level `OR`.
   */
  private applyBedroomFilter(
    where: Prisma.PropertyWhereInput,
    q: QueryPropertyDto,
  ) {
    const exact = q.bedrooms ?? [];
    const min = q.minBedrooms;
    const max = q.maxBedrooms;
    const hasExact = exact.length > 0;
    const hasMin = min != null && min > 0;
    const hasMax = max != null;

    if (hasExact && hasMin) {
      const clause: Prisma.PropertyWhereInput = {
        OR: [{ bedrooms: { in: exact } }, { bedrooms: { gte: min } }],
      };
      where.AND = Array.isArray(where.AND)
        ? [...where.AND, clause]
        : where.AND
          ? [where.AND, clause]
          : [clause];
      return;
    }
    if (hasExact) {
      where.bedrooms = { in: exact };
      return;
    }
    if (hasMin || hasMax) {
      where.bedrooms = {};
      if (hasMin) where.bedrooms.gte = min;
      if (hasMax) where.bedrooms.lte = max;
    }
  }

  /** Categorical enums: furnishing, material, condition, seller type, etc. */
  private applyClassificationFilters(
    where: Prisma.PropertyWhereInput,
    q: QueryPropertyDto,
  ) {
    if (q.furnishing) where.furnishing = q.furnishing;
    if (q.material) where.material = q.material;
    if (q.condition) where.condition = q.condition;
    if (q.sellerType) where.sellerType = q.sellerType;
    if (q.heating) where.heating = q.heating;
    if (q.ownership) where.ownership = q.ownership;
    if (q.windowType) where.windowType = q.windowType;
  }

  /** Boolean amenity toggles — all 18 flags from PropertyAmenitiesDto. */
  private applyAmenityFilters(
    where: Prisma.PropertyWhereInput,
    q: QueryPropertyDto,
  ) {
    if (q.hasBalcony) where.hasBalcony = true;
    if (q.hasTerrace) where.hasTerrace = true;
    if (q.hasParking) where.hasParking = true;
    if (q.hasGarage) where.hasGarage = true;
    if (q.hasSeparateKitchen) where.hasSeparateKitchen = true;
    if (q.hasStorage) where.hasStorage = true;
    if (q.hasElevator) where.hasElevator = true;
    if (q.hasInteriorStaircase) where.hasInteriorStaircase = true;
    if (q.hasWashingMachine) where.hasWashingMachine = true;
    if (q.hasFridge) where.hasFridge = true;
    if (q.hasStove) where.hasStove = true;
    if (q.hasOven) where.hasOven = true;
    if (q.hasAC) where.hasAC = true;
    if (q.hasBlinds) where.hasBlinds = true;
    if (q.hasArmoredDoors) where.hasArmoredDoors = true;
    if (q.hasIntercom) where.hasIntercom = true;
    if (q.hasInternet) where.hasInternet = true;
    if (q.hasCableTV) where.hasCableTV = true;
  }

  /** Listing-level predicates: hasImages, postedWithin age window. */
  private applyRecencyFilters(
    where: Prisma.PropertyWhereInput,
    q: QueryPropertyDto,
  ) {
    if (q.hasImages) where.images = { some: {} };

    if (q.postedWithin) {
      const hours =
        q.postedWithin === 'day'
          ? 24
          : q.postedWithin === '3days'
            ? 72
            : 168;
      where.createdAt = { gte: new Date(Date.now() - hours * 3600000) };
    }
  }

  /**
   * Geo prefilter. The radius path projects the circle onto a bounding box
   * (the exact haversine filter runs in `findAll`); the viewport path uses
   * the given sw/ne corners. When both are present the viewport corners win
   * — callers shouldn't combine them, but if they do, the map bounds are
   * the authoritative hint.
   */
  private applyGeoFilters(
    where: Prisma.PropertyWhereInput,
    q: QueryPropertyDto,
  ) {
    const { lat, lng, radius, swLat, swLng, neLat, neLng } = q;

    if (lat && lng && radius && radius > 0) {
      const kmPerDegLat = 111.32;
      const kmPerDegLng = 111.32 * Math.cos((lat * Math.PI) / 180);
      const dLat = radius / kmPerDegLat;
      const dLng = radius / kmPerDegLng;
      where.latitude = { gte: lat - dLat, lte: lat + dLat };
      where.longitude = { gte: lng - dLng, lte: lng + dLng };
    }

    if (swLat != null && swLng != null && neLat != null && neLng != null) {
      where.latitude = {
        ...(where.latitude as object),
        gte: swLat,
        lte: neLat,
      };
      where.longitude = {
        ...(where.longitude as object),
        gte: swLng,
        lte: neLng,
      };
    }
  }

  /** Full-text OR across localized title, address, and flat city/neighborhood. */
  private applySearchFilter(
    where: Prisma.PropertyWhereInput,
    q: QueryPropertyDto,
  ) {
    if (!q.search) return;
    const { search } = q;
    where.OR = [
      { title: { path: ['en'], string_contains: search } },
      { title: { path: ['ro'], string_contains: search } },
      { title: { path: ['fr'], string_contains: search } },
      { title: { path: ['de'], string_contains: search } },
      { city: { contains: search, mode: 'insensitive' } },
      { neighborhood: { contains: search, mode: 'insensitive' } },
      { address: { path: ['ro'], string_contains: search } },
      { address: { path: ['en'], string_contains: search } },
    ];
  }

  async findAll(query: QueryPropertyDto, site: SiteContext) {
    const {
      page = 1,
      limit = 12,
      lat,
      lng,
      radius,
      sort,
    } = query;

    const where = this.buildWhereClause(query, site);

    const orderBy: Prisma.PropertyOrderByWithRelationInput = {};
    switch (sort) {
      case 'price_asc':
        orderBy.price = 'asc';
        break;
      case 'price_desc':
        orderBy.price = 'desc';
        break;
      case 'oldest':
        orderBy.createdAt = 'asc';
        break;
      case 'newest':
      default:
        orderBy.createdAt = 'desc';
    }

    const useGeoFilter = lat && lng && radius && radius > 0;

    if (useGeoFilter) {
      // Bounding-box prefilter is applied in buildWhereClause. Fetch lightweight
      // candidates (id + coords) ordered correctly, haversine-filter to the exact
      // circle, then hydrate includes only for the current page.
      //
      // The hard cap bounds memory/CPU until the Haversine pass moves server-
      // side (Postgres earthdistance/cube). Hitting this cap means the radius +
      // bbox combined still match > GEO_CANDIDATE_CAP rows — narrow filters or
      // shrink the radius. Log a warning so it's visible in ops.
      const GEO_CANDIDATE_CAP = 2000;
      const candidates = await this.prisma.property.findMany({
        where,
        orderBy,
        select: { id: true, latitude: true, longitude: true },
        take: GEO_CANDIDATE_CAP,
      });
      if (candidates.length === GEO_CANDIDATE_CAP) {
        this.logger.warn(
          `Geo candidate cap hit (${GEO_CANDIDATE_CAP}) for lat=${lat} lng=${lng} radius=${radius} — results may be truncated before Haversine filter.`,
        );
      }

      const inRadius = candidates.filter(
        (p) => this.haversineKm(lat, lng, p.latitude, p.longitude) <= radius,
      );
      const total = inRadius.length;
      const pageIds = inRadius
        .slice((page - 1) * limit, page * limit)
        .map((p) => p.id);

      const rows = pageIds.length
        ? await this.prisma.property.findMany({
            where: { id: { in: pageIds } },
            include: {
              images: { orderBy: { sortOrder: 'asc' } },
              developer: true,
              agent: true,
            },
          })
        : [];

      // Restore the order established by the candidates query.
      const order = new Map(pageIds.map((id, i) => [id, i]));
      const data = rows.sort(
        (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
      );

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    return paginate(
      (skip, take) =>
        this.prisma.property.findMany({
          where,
          orderBy,
          skip,
          take,
          include: {
            images: { orderBy: { sortOrder: 'asc' } },
            developer: true,
            agent: true,
          },
        }),
      () => this.prisma.property.count({ where }),
      page,
      limit,
    );
  }

  async findMapPins(query: QueryPropertyDto, site: SiteContext) {
    const where = this.buildWhereClause(query, site);

    // Map callers provide lightweight pins (no images beyond the hero), but
    // a missing bbox + no tier/city filter would previously return up to 5000
    // rows. Clamp hard so a generous `limit` can't scale the payload; the
    // client can reduce it to paint faster but never raise it above the cap.
    const MAP_PINS_HARD_CAP = 1000;
    const requested = query.limit ?? 500;
    const take = Math.min(Math.max(requested, 1), MAP_PINS_HARD_CAP);

    const properties = await this.prisma.property.findMany({
      where,
      select: {
        id: true,
        slug: true,
        latitude: true,
        longitude: true,
        price: true,
        type: true,
        images: {
          where: { isHero: true },
          select: { src: true },
          take: 1,
        },
      },
      take,
    });

    if (properties.length === MAP_PINS_HARD_CAP) {
      this.logger.warn(
        `Map pins hard cap hit (${MAP_PINS_HARD_CAP}) — caller should narrow filters or send a bbox.`,
      );
    }

    return properties.map((p) => ({
      id: p.id,
      slug: p.slug,
      latitude: p.latitude,
      longitude: p.longitude,
      price: p.price,
      type: p.type,
      heroImageSrc: p.images[0]?.src ?? null,
    }));
  }

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  async findById(id: string, site: SiteContext) {
    const property = await ensureFound(
      this.prisma.property.findUnique({
        where: { id },
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          developer: true,
          agent: true,
        },
      }),
      'Property',
    );
    this.assertTierInScope(property.tier, site);
    return property;
  }

  async findBySlug(slug: string, site: SiteContext) {
    const property = await ensureFound(
      this.prisma.property.findUnique({
        where: { slug },
        include: {
          images: { orderBy: { sortOrder: 'asc' } },
          developer: true,
          agent: true,
        },
      }),
      'Property',
    );
    this.assertTierInScope(property.tier, site);
    return property;
  }

  /**
   * Enforce brand isolation on single-row reads. We return 404 (not 403) so a
   * site can't probe the existence of tiers outside its scope.
   */
  private assertTierInScope(tier: PropertyTier, site: SiteContext): void {
    const scope = SITE_TIER_SCOPE[site.id];
    if (scope === null) return;
    if (!scope.includes(tier)) {
      throw new NotFoundException('Property not found');
    }
  }

  async create(dto: CreatePropertyDto) {
    await Promise.all([
      ensureSlugUnique(dto.slug, 'Property', (slug) =>
        this.prisma.property.findUnique({
          where: { slug },
          select: { id: true },
        }),
      ),
      this.validateRefs(dto.developerId, dto.agentId),
    ]);

    const created = await this.prisma.property.create({
      data: {
        slug: dto.slug,
        title: toJson(dto.title),
        description: toJson(dto.description),
        shortDescription:
          toJson(dto.shortDescription),
        price: dto.price,
        currency: dto.currency ?? 'EUR',
        type: dto.type,
        status: dto.status ?? PropertyStatus.available,
        tier: dto.tier,
        city: dto.city,
        citySlug: dto.citySlug,
        neighborhood: dto.neighborhood,
        address: toJson(dto.address),
        latitude: dto.coordinates.lat,
        longitude: dto.coordinates.lng,
        bedrooms: dto.bedrooms,
        bathrooms: dto.bathrooms,
        area: dto.area,
        landArea: dto.landArea,
        floors: dto.floors,
        yearBuilt: dto.yearBuilt,
        garage: dto.garage,
        pool: dto.pool,
        floor: dto.floor,
        furnishing: dto.furnishing,
        material: dto.material,
        condition: dto.condition,
        sellerType: dto.sellerType,
        heating: dto.heating,
        ownership: dto.ownership,
        windowType: dto.windowType,
        availabilityDate: dto.availabilityDate ? new Date(dto.availabilityDate) : undefined,
        ...this.amenityCreateData(dto),
        features: toJson(dto.features ?? []),
        featured: dto.featured ?? false,
        isNew: dto.isNew ?? false,
        developerId: dto.developerId,
        agentId: dto.agentId,
      },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        developer: true,
        agent: true,
      },
    });

    return created;
  }

  async update(id: string, dto: UpdatePropertyDto) {
    await this.ensureExists(id);
    await this.validateRefs(dto.developerId, dto.agentId);

    const data: Prisma.PropertyUpdateInput = {};

    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.title !== undefined)
      data.title = toJson(dto.title);
    if (dto.description !== undefined)
      data.description = toJson(dto.description);
    if (dto.shortDescription !== undefined)
      data.shortDescription =
        toJson(dto.shortDescription);
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.tier !== undefined) data.tier = dto.tier;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.citySlug !== undefined) data.citySlug = dto.citySlug;
    if (dto.neighborhood !== undefined) data.neighborhood = dto.neighborhood;
    if (dto.address !== undefined)
      data.address = toJson(dto.address);
    if (dto.coordinates !== undefined) {
      data.latitude = dto.coordinates.lat;
      data.longitude = dto.coordinates.lng;
    }
    if (dto.bedrooms !== undefined) data.bedrooms = dto.bedrooms;
    if (dto.bathrooms !== undefined) data.bathrooms = dto.bathrooms;
    if (dto.area !== undefined) data.area = dto.area;
    if (dto.landArea !== undefined) data.landArea = dto.landArea;
    if (dto.floors !== undefined) data.floors = dto.floors;
    if (dto.yearBuilt !== undefined) data.yearBuilt = dto.yearBuilt;
    if (dto.garage !== undefined) data.garage = dto.garage;
    if (dto.pool !== undefined) data.pool = dto.pool;
    if (dto.floor !== undefined) data.floor = dto.floor;
    if (dto.furnishing !== undefined) data.furnishing = dto.furnishing;
    if (dto.material !== undefined) data.material = dto.material;
    if (dto.condition !== undefined) data.condition = dto.condition;
    if (dto.sellerType !== undefined) data.sellerType = dto.sellerType;
    if (dto.heating !== undefined) data.heating = dto.heating;
    if (dto.ownership !== undefined) data.ownership = dto.ownership;
    if (dto.windowType !== undefined) data.windowType = dto.windowType;
    if (dto.availabilityDate !== undefined)
      data.availabilityDate = dto.availabilityDate ? new Date(dto.availabilityDate) : null;
    Object.assign(data, this.amenityUpdatePatch(dto));
    if (dto.features !== undefined)
      data.features = toJson(dto.features);
    if (dto.featured !== undefined) data.featured = dto.featured;
    if (dto.isNew !== undefined) data.isNew = dto.isNew;
    if (dto.developerId !== undefined) {
      data.developer = dto.developerId
        ? { connect: { id: dto.developerId } }
        : { disconnect: true };
    }
    if (dto.agentId !== undefined) {
      data.agent = dto.agentId
        ? { connect: { id: dto.agentId } }
        : { disconnect: true };
    }

    const updated = await this.prisma.property.update({
      where: { id },
      data,
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        developer: true,
        agent: true,
      },
    });

    return updated;
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.property.delete({ where: { id } });
  }

  // Image management
  async addImages(id: string, files: Express.Multer.File[]) {
    await this.ensureExists(id);

    const results = await this.uploadsService.uploadFiles(files, 'properties');
    const maxOrder = await this.prisma.propertyImage.aggregate({
      where: { propertyId: id },
      _max: { sortOrder: true },
    });
    const startOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const images = await Promise.all(
      results.map((result, index) =>
        this.prisma.propertyImage.create({
          data: {
            src: result.publicUrl,
            alt: { en: result.originalName, ro: result.originalName },
            sortOrder: startOrder + index,
            propertyId: id,
          },
        }),
      ),
    );

    return images;
  }

  async updateImage(
    propertyId: string,
    imageId: string,
    dto: UpdatePropertyImageDto,
  ) {
    await this.ensureExists(propertyId);

    const data: Prisma.PropertyImageUpdateInput = {};
    if (dto.alt !== undefined)
      data.alt = toJson(dto.alt);
    if (dto.isHero !== undefined) data.isHero = dto.isHero;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    return this.prisma.propertyImage.update({
      where: { id: imageId },
      data,
    });
  }

  async removeImage(propertyId: string, imageId: string) {
    await this.ensureExists(propertyId);
    return this.prisma.propertyImage.delete({ where: { id: imageId } });
  }

  private ensureExists(id: string) {
    return ensureFound(
      this.prisma.property.findUnique({ where: { id } }),
      'Property',
    );
  }

  /**
   * Amenity flag fan-out for create: every flag defaults to false so a
   * property's amenity row is fully populated at insert time. Driven by
   * `AMENITY_KEYS` so adding an amenity to the shared Zod schema doesn't
   * require a service edit.
   */
  private amenityCreateData(
    dto: Partial<Record<AmenityKey, boolean | undefined>>,
  ): Record<AmenityKey, boolean> {
    const out = {} as Record<AmenityKey, boolean>;
    for (const key of AMENITY_KEYS) {
      out[key] = dto[key] ?? false;
    }
    return out;
  }

  /**
   * Amenity patch for update: only include flags the caller actually sent,
   * so `PATCH { hasBalcony: true }` doesn't silently clobber the other 17.
   */
  private amenityUpdatePatch(
    dto: Partial<Record<AmenityKey, boolean | undefined>>,
  ): Partial<Record<AmenityKey, boolean>> {
    const out: Partial<Record<AmenityKey, boolean>> = {};
    for (const key of AMENITY_KEYS) {
      const value = dto[key];
      if (value !== undefined) out[key] = value;
    }
    return out;
  }

  private async validateRefs(
    developerId?: string | null,
    agentId?: string | null,
  ) {
    await Promise.all([
      ensureRef(developerId, 'developerId', (id) =>
        this.prisma.developer.findUnique({
          where: { id },
          select: { id: true },
        }),
      ),
      ensureRef(agentId, 'agentId', (id) =>
        this.prisma.agent.findUnique({
          where: { id },
          select: { id: true },
        }),
      ),
    ]);
  }
}
