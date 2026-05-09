import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Brand, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { SiteConfigService } from '../site-config/site-config.service';
import {
  cityBrandWhere,
  isCityInBrand,
  SiteContext,
  tierScopeFilter,
} from '../common/site';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { ensureFound } from '../common/utils/ensure-found.util';
import { ensureSlugUnique } from '../common/utils/ensure-slug-unique.util';
import { paginate } from '../common/utils/pagination.util';
import { toJson } from '../common/utils/prisma-json';
import { applyDraftMode } from '../common/utils/entry-draft';

const UNPAGINATED_CAP = 200;

function resolveCitySort(
  sort: string | undefined,
):
  | Prisma.CityOrderByWithRelationInput
  | Prisma.CityOrderByWithRelationInput[] {
  switch (sort) {
    case 'name_desc':
      return { name: 'desc' };
    case 'newest':
      return { createdAt: 'desc' };
    case 'oldest':
      return { createdAt: 'asc' };
    case 'propertyCount_desc':
      return [{ propertyCount: 'desc' }, { name: 'asc' }];
    case 'propertyCount_asc':
      return [{ propertyCount: 'asc' }, { name: 'asc' }];
    case 'name_asc':
    default:
      return { name: 'asc' };
  }
}

@Injectable()
export class CitiesService {
  private readonly logger = new Logger(CitiesService.name);

  constructor(
    private prisma: PrismaService,
    private uploadsService: UploadsService,
    private siteConfig: SiteConfigService,
  ) {}

  /**
   * Returns the Prisma `_count: { properties: { where: ... } }` shape for the
   * caller's site. The denormalized `City.property_count` column was getting
   * out of sync every time properties were added/removed (no triggers, no
   * app-level increments) — counting via the relation, scoped to the brand's
   * tier filter, keeps tiles honest without anyone having to remember to bump
   * a counter. ADMIN sees the unfiltered count.
   */
  private propertyCountSelect(site: SiteContext) {
    const tier = tierScopeFilter(site);
    return {
      properties: tier === undefined ? true : { where: { tier } },
    } as const;
  }

  /**
   * Strip Prisma's nested `_count.properties` and surface it as the flat
   * `propertyCount` field clients already consume, plus flatten the
   * `CityBrand[]` relation into `brands: Brand[]` so the admin can render
   * badges without an extra fetch.
   */
  private withLiveCount<
    T extends {
      _count: { properties: number };
      brands?: { brand: Brand }[];
    },
  >(
    row: T,
  ): Omit<T, '_count' | 'brands'> & {
    propertyCount: number;
    brands: Brand[];
  } {
    const { _count, brands, ...rest } = row;
    return {
      ...rest,
      propertyCount: _count.properties,
      brands: (brands ?? []).map((b) => b.brand),
    };
  }

  async findAll(
    query: {
      county?: string;
      search?: string;
      sort?: string;
      page?: number;
      limit?: number;
      featured?: boolean;
      /**
       * Admin-only `?brand=<id>` override. Layered on top of the site-context
       * brand gate: an admin (X-Site: ADMIN, no implicit brand) can opt into
       * `?brand=tge` to inspect the TGE-tagged subset; a public site can pass
       * its own brand and get a no-op intersection. Lets the admin
       * brand-context switcher round-trip without needing a dedicated route.
       */
      brand?: Brand;
    } = {},
    site: SiteContext,
  ) {
    const siteFilter = cityBrandWhere(site);
    const queryFilter: Prisma.CityWhereInput | undefined = query.brand
      ? { brands: { some: { brand: query.brand } } }
      : undefined;
    const brandFilter: Prisma.CityWhereInput | undefined = queryFilter
      ? siteFilter
        ? { AND: [siteFilter, queryFilter] }
        : queryFilter
      : siteFilter;

    // Curated home-page subset. Site-scoped slug list lives on SiteConfig
    // and dictates ORDER for the brand's hero tiles. Visibility is enforced
    // by the brand membership filter (city_brands join) — a slug in the
    // curated list that hasn't been brand-tagged is silently dropped, which
    // matches the rule for the listing pages and prevents stale curation
    // entries from leaking out-of-scope cities.
    if (query.featured) {
      const slugs = await this.siteConfig.getHomepageCities(site.id);
      if (slugs.length > 0) {
        const featuredInclude = {
          county: true,
          _count: { select: this.propertyCountSelect(site) },
          brands: { select: { brand: true } },
        } satisfies Prisma.CityInclude;
        const featuredWhere: Prisma.CityWhereInput = brandFilter
          ? { AND: [{ slug: { in: [...slugs] } }, brandFilter] }
          : { slug: { in: [...slugs] } };
        const rows = await this.prisma.city.findMany({
          where: featuredWhere,
          include: featuredInclude,
        });
        // Postgres `IN` doesn't preserve argument order, so sort in-memory by
        // the curated slug list. A slug that doesn't resolve (typo, deleted
        // city) is silently dropped rather than rendered as a broken tile.
        const bySlug = new Map(rows.map((r) => [r.slug, r]));
        return slugs
          .map((slug) => bySlug.get(slug))
          .filter((r): r is (typeof rows)[number] => r !== undefined)
          .map((r) => this.withLiveCount(r));
      }
      this.logger.warn(
        `Homepage cities not configured for site ${site.id}; falling back to default listing`,
      );
    }

    const where: Prisma.CityWhereInput = {};
    if (query.county) where.county = { slug: query.county };
    if (query.search) {
      const s = query.search;
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { slug: { contains: s, mode: 'insensitive' } },
      ];
    }
    if (brandFilter) {
      // Compose via AND so the brand clause doesn't clobber OR-search clauses
      // above and survives any future filter additions that use top-level
      // where fields.
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        brandFilter,
      ];
    }

    const include = {
      county: true,
      _count: { select: this.propertyCountSelect(site) },
      brands: { select: { brand: true } },
    } satisfies Prisma.CityInclude;
    const orderBy = resolveCitySort(query.sort);

    const isPaginated =
      query.page !== undefined ||
      query.limit !== undefined ||
      query.search !== undefined ||
      query.sort !== undefined;

    if (isPaginated) {
      const page = query.page ?? 1;
      const limit = Math.min(query.limit ?? 50, UNPAGINATED_CAP);
      const result = await paginate(
        (skip, take) =>
          this.prisma.city.findMany({
            where,
            include,
            orderBy,
            skip,
            take,
          }),
        () => this.prisma.city.count({ where }),
        page,
        limit,
      );
      return { ...result, data: result.data.map((r) => this.withLiveCount(r)) };
    }

    const rows = await this.prisma.city.findMany({
      where,
      orderBy,
      include,
      take: UNPAGINATED_CAP,
    });
    if (rows.length === UNPAGINATED_CAP) {
      this.logger.warn(
        `Cities unpaginated cap hit (${UNPAGINATED_CAP}) — switch the caller to pagination.`,
      );
    }
    return rows.map((r) => this.withLiveCount(r));
  }

  async findById(id: string, site: SiteContext) {
    const city = await ensureFound(
      this.prisma.city.findUnique({
        where: { id },
        include: {
          county: true,
          _count: { select: this.propertyCountSelect(site) },
          brands: { select: { brand: true } },
        },
      }),
      'City',
    );
    await this.assertInBrand(city.slug, site);
    return this.withLiveCount(city);
  }

  async findBySlug(slug: string, site: SiteContext) {
    const city = await ensureFound(
      this.prisma.city.findUnique({
        where: { slug },
        include: {
          county: true,
          _count: { select: this.propertyCountSelect(site) },
          brands: { select: { brand: true } },
        },
      }),
      'City',
    );
    await this.assertInBrand(city.slug, site);
    return this.withLiveCount(city);
  }

  async findNeighborhoods(citySlug: string, site: SiteContext) {
    // Route through the scoped slug lookup so out-of-scope cities 404 here
    // too, rather than returning an empty array that implies "this city
    // exists but has no neighborhoods".
    const city = await this.findBySlug(citySlug, site);
    return this.prisma.neighborhood.findMany({
      where: { cityId: city.id },
      orderBy: { name: 'asc' },
    });
  }

  async create(dto: CreateCityDto) {
    await ensureSlugUnique(dto.slug, 'City', (slug) =>
      this.prisma.city.findUnique({
        where: { slug },
        select: { id: true },
      }),
    );
    const county = await ensureFound(
      this.prisma.county.findUnique({ where: { slug: dto.countySlug } }),
      'County',
    );
    return this.prisma.city.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: toJson(dto.description),
        image: dto.image ?? '/uploads/placeholder-city.png',
        propertyCount: dto.propertyCount ?? 0,
        county: { connect: { id: county.id } },
        ...(dto.brands && dto.brands.length > 0
          ? {
              brands: {
                create: dto.brands.map((brand) => ({ brand })),
              },
            }
          : {}),
      },
    });
  }

  async update(id: string, dto: UpdateCityDto) {
    await this.ensureExists(id);
    const data: Prisma.CityUpdateInput = {};

    const { live, draft } = applyDraftMode(
      dto,
      ['description'] as const,
      dto.mode,
    );
    if (live.description !== undefined) data.description = live.description;
    if (draft !== undefined) data.draft = draft;

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.image !== undefined) data.image = dto.image;
    if (dto.propertyCount !== undefined) data.propertyCount = dto.propertyCount;

    // Brand membership diff. The form sends the whole desired set; we read
    // the current rows and reconcile with INSERT/DELETE so the city ends up
    // tagged with exactly `dto.brands`. Wrapped in a single transaction with
    // the row update so a partial failure doesn't leave the city's brand set
    // half-applied.
    if (dto.brands !== undefined) {
      const desired = new Set<Brand>(dto.brands);
      const current = await this.prisma.cityBrand.findMany({
        where: { cityId: id },
        select: { brand: true },
      });
      const currentSet = new Set<Brand>(current.map((r) => r.brand));
      const toAdd: Brand[] = [...desired].filter((b) => !currentSet.has(b));
      const toRemove: Brand[] = [...currentSet].filter((b) => !desired.has(b));

      return this.prisma.$transaction(async (tx) => {
        const updated = await tx.city.update({ where: { id }, data });
        if (toAdd.length > 0) {
          await tx.cityBrand.createMany({
            data: toAdd.map((brand) => ({ cityId: id, brand })),
            skipDuplicates: true,
          });
        }
        if (toRemove.length > 0) {
          await tx.cityBrand.deleteMany({
            where: { cityId: id, brand: { in: toRemove } },
          });
        }
        return updated;
      });
    }

    return this.prisma.city.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.city.delete({ where: { id } });
  }

  async uploadImage(id: string, file: Express.Multer.File) {
    await this.ensureExists(id);
    const result = await this.uploadsService.uploadFile(file, 'cities');
    return this.prisma.city.update({
      where: { id },
      data: { image: result.publicUrl },
    });
  }

  /**
   * Idempotent insert into `city_brands`. Re-tagging an already-tagged city
   * is a no-op rather than an error so the admin's optimistic toggle UI can
   * retry without user-visible failures.
   */
  async addBrand(id: string, brand: Brand) {
    await this.ensureExists(id);
    this.assertBrand(brand);
    await this.prisma.cityBrand.upsert({
      where: { cityId_brand: { cityId: id, brand } },
      create: { cityId: id, brand },
      update: {},
    });
    return { cityId: id, brand };
  }

  /**
   * Idempotent delete from `city_brands`. Removing a tag that doesn't exist
   * is a no-op for the same reason as `addBrand`.
   */
  async removeBrand(id: string, brand: Brand) {
    await this.ensureExists(id);
    this.assertBrand(brand);
    await this.prisma.cityBrand.deleteMany({
      where: { cityId: id, brand },
    });
    return { cityId: id, brand };
  }

  private assertBrand(brand: string): asserts brand is Brand {
    if (brand !== 'tge' && brand !== 'revery') {
      throw new BadRequestException(`Unknown brand: ${brand}`);
    }
  }

  private ensureExists(id: string) {
    return ensureFound(
      this.prisma.city.findUnique({ where: { id } }),
      'City',
    );
  }

  /**
   * 404 when a single-row lookup falls outside the caller's brand. Brand
   * membership is the sole gate now — a city is reachable iff it has a
   * row in `city_brands` for the caller's brand. 404 (not 403) avoids
   * leaking the existence of out-of-brand rows.
   */
  private async assertInBrand(
    citySlug: string,
    site: SiteContext,
  ): Promise<void> {
    const inBrand = await isCityInBrand(site, citySlug, this.prisma);
    if (!inBrand) throw new NotFoundException('City not found');
  }
}
