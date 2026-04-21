import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { SiteConfigService } from '../site-config/site-config.service';
import {
  cityGeoWhere,
  isCountyInScope,
  resolveGeoScope,
  SiteContext,
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

  async findAll(
    query: {
      county?: string;
      search?: string;
      sort?: string;
      page?: number;
      limit?: number;
    } = {},
    site: SiteContext,
  ) {
    const scope = await resolveGeoScope(site, this.siteConfig);
    const geo = cityGeoWhere(scope);

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

    const include = { county: true };
    const orderBy = resolveCitySort(query.sort);

    const isPaginated =
      query.page !== undefined ||
      query.limit !== undefined ||
      query.search !== undefined ||
      query.sort !== undefined;

    if (isPaginated) {
      const page = query.page ?? 1;
      const limit = Math.min(query.limit ?? 50, UNPAGINATED_CAP);
      return paginate(
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
    return rows;
  }

  async findById(id: string, site: SiteContext) {
    const city = await ensureFound(
      this.prisma.city.findUnique({
        where: { id },
        include: { county: true },
      }),
      'City',
    );
    await this.assertInScope(city.county.slug, site);
    return city;
  }

  async findBySlug(slug: string, site: SiteContext) {
    const city = await ensureFound(
      this.prisma.city.findUnique({
        where: { slug },
        include: { county: true },
      }),
      'City',
    );
    await this.assertInScope(city.county.slug, site);
    return city;
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
   * 404 when a single-row lookup falls outside the caller's brand geo scope.
   * Same rationale as assertTierInScope: 404 (not 403) avoids leaking the
   * existence of out-of-scope rows to the Transylvania Grand Estate site.
   */
  private async assertInScope(
    countySlug: string,
    site: SiteContext,
  ): Promise<void> {
    const scope = await resolveGeoScope(site, this.siteConfig);
    if (!isCountyInScope(countySlug, scope)) {
      throw new NotFoundException('City not found');
    }
  }
}
