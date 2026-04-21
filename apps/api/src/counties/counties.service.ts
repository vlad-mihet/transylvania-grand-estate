import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCountyDto } from './dto/create-county.dto';
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
    const include = query.light
      ? undefined
      : { cities: { orderBy: { name: 'asc' as const }, select: { id: true } } };

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
          this.prisma.county.findMany({
            where,
            include,
            orderBy,
            skip,
            take,
          }),
        () => this.prisma.county.count({ where }),
        page,
        limit,
      );
    }

    const rows = await this.prisma.county.findMany({
      where,
      orderBy,
      include: query.light
        ? undefined
        : { cities: { orderBy: { name: 'asc' } } },
      take: UNPAGINATED_CAP,
    });
    if (rows.length === UNPAGINATED_CAP) {
      this.logger.warn(
        `Counties unpaginated cap hit (${UNPAGINATED_CAP}) — switch the caller to pagination.`,
      );
    }
    return rows;
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

  async remove(id: string) {
    const county = await this.prisma.county.findUnique({ where: { id } });
    if (!county) throw new NotFoundException('County not found');
    return this.prisma.county.delete({ where: { id } });
  }
}
