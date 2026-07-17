import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCountyDto } from './dto/create-county.dto';
import { UpdateCountyDto } from './dto/update-county.dto';
import { paginate } from '../common/utils/pagination.util';

const UNPAGINATED_CAP = 100;

function resolveCountySort(
  sort: string | undefined,
): Prisma.CountyOrderByWithRelationInput {
  switch (sort) {
    case 'name_desc':
      return { name: 'desc' };
    case 'newest':
      return { createdAt: 'desc' };
    case 'oldest':
      return { createdAt: 'asc' };
    case 'code_asc':
      return { code: 'asc' };
    case 'code_desc':
      return { code: 'desc' };
    case 'name_asc':
    default:
      return { name: 'asc' };
  }
}

@Injectable()
export class CountiesService {
  private readonly logger = new Logger(CountiesService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Counties are universal — every county is reachable from every brand
   * because they're consumed as filter chips on the public sites, not as
   * visibility gates. Brand membership lives on cities (city_brands), not
   * here. No SiteContext-based filtering happens at this layer.
   */
  async findAll(
    query: {
      search?: string;
      sort?: string;
      page?: number;
      limit?: number;
      /** Omit the cities include when the caller only wants the header row. */
      light?: boolean;
    } = {},
  ) {
    const where: Prisma.CountyWhereInput = {};
    if (query.search) {
      const s = query.search;
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { slug: { contains: s, mode: 'insensitive' } },
        { code: { contains: s, mode: 'insensitive' } },
      ];
    }

    const orderBy = resolveCountySort(query.sort);
    // Pull each county's cities WITH their (maintained) property_count so we can
    // roll it up into the county. County.property_count is a stored column that
    // is never kept in sync (seeded 0), so the admin list showed 0 for every
    // county (BUG-210) — derive it live from the cities instead.
    const include = query.light
      ? undefined
      : {
          cities: {
            orderBy: { name: 'asc' as const },
            select: { id: true, propertyCount: true },
          },
        };

    const isPaginated =
      query.page !== undefined ||
      query.limit !== undefined ||
      query.search !== undefined ||
      query.sort !== undefined;

    if (isPaginated) {
      const page = query.page ?? 1;
      const limit = Math.min(query.limit ?? 50, UNPAGINATED_CAP);
      return paginate(
        async (skip, take) =>
          this.withRolledUpPropertyCount(
            await this.prisma.county.findMany({
              where,
              include,
              orderBy,
              skip,
              take,
            }),
          ),
        () => this.prisma.county.count({ where }),
        page,
        limit,
      );
    }

    const rows = await this.prisma.county.findMany({
      where,
      orderBy,
      include,
      take: UNPAGINATED_CAP,
    });
    if (rows.length === UNPAGINATED_CAP) {
      this.logger.warn(
        `Counties unpaginated cap hit (${UNPAGINATED_CAP}) — switch the caller to pagination.`,
      );
    }
    return this.withRolledUpPropertyCount(rows);
  }

  /**
   * Overrides each county's stored (stale-0) property_count with the sum of its
   * cities' maintained counts. No-op for `light` rows that carry no cities.
   */
  private withRolledUpPropertyCount<
    T extends { cities?: { propertyCount: number }[] },
  >(rows: T[]): T[] {
    return rows.map((row) =>
      row.cities
        ? {
            ...row,
            propertyCount: row.cities.reduce(
              (sum, city) => sum + city.propertyCount,
              0,
            ),
          }
        : row,
    );
  }

  async findBySlug(slug: string) {
    const county = await this.prisma.county.findUnique({
      where: { slug },
      include: { cities: { orderBy: { name: 'asc' } } },
    });
    if (!county) throw new NotFoundException('County not found');
    return county;
  }

  async create(dto: CreateCountyDto) {
    return this.prisma.county.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        code: dto.code,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
    });
  }

  async update(id: string, dto: UpdateCountyDto) {
    const county = await this.prisma.county.findUnique({ where: { id } });
    if (!county) throw new NotFoundException('County not found');
    const data: Prisma.CountyUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.code !== undefined) data.code = dto.code;
    if (dto.latitude !== undefined) data.latitude = dto.latitude;
    if (dto.longitude !== undefined) data.longitude = dto.longitude;
    return this.prisma.county.update({ where: { id }, data });
  }

  async remove(id: string) {
    const county = await this.prisma.county.findUnique({ where: { id } });
    if (!county) throw new NotFoundException('County not found');
    return this.prisma.county.delete({ where: { id } });
  }
}
