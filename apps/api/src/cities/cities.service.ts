import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { SiteConfigService } from '../site-config/site-config.service';
import {
  cityGeoWhere,
  isCityVisible,
  isCountyInScope,
  resolveGeoScope,
  SiteContext,
  tierScopeFilter,
} from '../common/site';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { ensureFound } from '../common/utils/ensure-found.util';
import { ensureSlugUnique } from '../common/utils/ensure-slug-unique.util';
import { paginate } from '../common/utils/pagination.util';
import { toJson } from '../common/utils/prisma-json';

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
   * `propertyCount` field clients already consume. Keeps the API response
   * shape stable so `mapApiCity` and the City type don't change.
   */
  private withLiveCount<
    T extends { _count: { properties: number } },
  >(row: T): Omit<T, '_count'> & { propertyCount: number } {
    const { _count, ...rest } = row;
    return { ...rest, propertyCount: _count.properties };
  }

  async findAll(
    query: {
      county?: string;
      search?: string;
      sort?: string;
      page?: number;
      limit?: number;
      featured?: boolean;
    } = {},
    site: SiteContext,
  ) {
    const scope = await resolveGeoScope(site, this.siteConfig);
    const geo = cityGeoWhere(scope);

    // Curated home-page subset. Site-scoped slug list lives on SiteConfig
    // (alongside tgeCountyScope / tgeHiddenCities) and is resolved here so the
    // front-end stays a dumb consumer. Empty list → fall through to the
    // default unfiltered response so an unseeded env doesn't blank the home
    // page; non-empty list short-circuits paging/sorting entirely because
    // the curated order IS the answer.
    //
    // Curation deliberately bypasses cityGeoWhere(scope). The default TGE
    // geo allowlist is Transylvania-only, but the homepage curation can —
    // and does — feature national cities (București, Iași, Constanța…) the
    // client wants surfaced for the brand. Treating the curated list as an
    // explicit admin override is the whole point of having it; re-applying
    // the geo filter would silently drop those tiles. Property counts still
    // pass through `tierScopeFilter` so each tile reflects only its brand's
    // tier of properties.
    if (query.featured) {
      const slugs = await this.siteConfig.getHomepageCities(site.id);
      if (slugs.length > 0) {
        const featuredInclude = {
          county: true,
          _count: { select: this.propertyCountSelect(site) },
        } satisfies Prisma.CityInclude;
        const rows = await this.prisma.city.findMany({
          where: { slug: { in: [...slugs] } },
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
    if (geo) {
      // Compose via AND so the geo clause doesn't clobber OR-search clauses
      // above and survives any future filter additions that use top-level
      // where fields.
      where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), geo];
    }

    const include = {
      county: true,
      _count: { select: this.propertyCountSelect(site) },
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
        },
      }),
      'City',
    );
    await this.assertInScope(city.slug, city.county.slug, site);
    return this.withLiveCount(city);
  }

  async findBySlug(slug: string, site: SiteContext) {
    const city = await ensureFound(
      this.prisma.city.findUnique({
        where: { slug },
        include: {
          county: true,
          _count: { select: this.propertyCountSelect(site) },
        },
      }),
      'City',
    );
    await this.assertInScope(city.slug, city.county.slug, site);
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
      },
    });
  }

  async update(id: string, dto: UpdateCityDto) {
    await this.ensureExists(id);
    const data: Prisma.CityUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.description !== undefined)
      data.description = toJson(dto.description);
    if (dto.image !== undefined) data.image = dto.image;
    if (dto.propertyCount !== undefined) data.propertyCount = dto.propertyCount;

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

  private ensureExists(id: string) {
    return ensureFound(
      this.prisma.city.findUnique({ where: { id } }),
      'City',
    );
  }

  /**
   * 404 when a single-row lookup falls outside the caller's brand geo scope —
   * either by county allowlist or by the per-brand hidden-city denylist
   * (e.g. Târnăveni on TGE). Same rationale as assertTierInScope: 404 (not
   * 403) avoids leaking the existence of out-of-scope rows to the
   * Transylvania Grand Estate site.
   *
   * Featured-curation override: a city present in the site's home-page
   * curated list (SiteConfig.{tge,revery}HomepageCities) is reachable even
   * when its county sits outside the default geo allowlist. Mirrors what
   * `findAll({ featured: true })` already does for the listing — the tile
   * is on the home page, so the user must be able to click into it. Without
   * this override, TGE's curated cross-country tiles (București, Iași,
   * Constanța…) 404 on click.
   */
  private async assertInScope(
    citySlug: string,
    countySlug: string,
    site: SiteContext,
  ): Promise<void> {
    const scope = await resolveGeoScope(site, this.siteConfig);
    if (isCountyInScope(countySlug, scope) && isCityVisible(citySlug, scope)) {
      return;
    }
    const featured = await this.siteConfig.getHomepageCities(site.id);
    if (featured.includes(citySlug)) return;
    throw new NotFoundException('City not found');
  }
}
