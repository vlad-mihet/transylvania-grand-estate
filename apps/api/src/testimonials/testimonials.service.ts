import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';
import { ensureFound } from '../common/utils/ensure-found.util';
import { paginate } from '../common/utils/pagination.util';
import { toJson } from '../common/utils/prisma-json';

// Cap on the legacy unpaginated path so a bloated testimonials table can't
// ever return unbounded rows. Intentionally generous since callers have no
// way to page — if we ever exceed this, callers should opt in to pagination
// via `?page=` / `?limit=` and switch to the `{ data, meta }` shape.
const UNPAGINATED_CAP = 100;

function resolveTestimonialSort(
  sort: string | undefined,
): Prisma.TestimonialOrderByWithRelationInput {
  switch (sort) {
    case 'oldest':
      return { createdAt: 'asc' };
    case 'rating_desc':
      return { rating: 'desc' };
    case 'rating_asc':
      return { rating: 'asc' };
    case 'newest':
    default:
      return { createdAt: 'desc' };
  }
}

@Injectable()
export class TestimonialsService {
  private readonly logger = new Logger(TestimonialsService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(
    query: {
      page?: number;
      limit?: number;
      search?: string;
      sort?: string;
    } = {},
  ) {
    const where: Prisma.TestimonialWhereInput = {};
    if (query.search) {
      const s = query.search;
      where.OR = [
        { clientName: { contains: s, mode: 'insensitive' } },
        { location: { contains: s, mode: 'insensitive' } },
        { propertyType: { contains: s, mode: 'insensitive' } },
      ];
    }

    const orderBy = resolveTestimonialSort(query.sort);

    // Opt-in pagination: when any of page/limit/search/sort is provided, return
    // the shared `{ data, meta }` envelope. Legacy callers (no params) keep
    // getting a raw array, now bounded by `UNPAGINATED_CAP`.
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
          this.prisma.testimonial.findMany({ where, orderBy, skip, take }),
        () => this.prisma.testimonial.count({ where }),
        page,
        limit,
      );
    }

    const rows = await this.prisma.testimonial.findMany({
      where,
      orderBy,
      take: UNPAGINATED_CAP,
    });
    if (rows.length === UNPAGINATED_CAP) {
      this.logger.warn(
        `Testimonials unpaginated cap hit (${UNPAGINATED_CAP}) — switch the caller to pagination.`,
      );
    }
    return rows;
  }

  async findById(id: string) {
    return ensureFound(
      this.prisma.testimonial.findUnique({ where: { id } }),
      'Testimonial',
    );
  }

  async create(dto: CreateTestimonialDto) {
    return this.prisma.testimonial.create({
      data: {
        clientName: dto.clientName,
        location: dto.location,
        propertyType: dto.propertyType,
        quote: toJson(dto.quote),
        rating: dto.rating,
      },
    });
  }

  async update(id: string, dto: UpdateTestimonialDto) {
    await this.ensureExists(id);
    const data: Prisma.TestimonialUpdateInput = {};

    if (dto.clientName !== undefined) data.clientName = dto.clientName;
    if (dto.location !== undefined) data.location = dto.location;
    if (dto.propertyType !== undefined) data.propertyType = dto.propertyType;
    if (dto.quote !== undefined)
      data.quote = toJson(dto.quote);
    if (dto.rating !== undefined) data.rating = dto.rating;

    return this.prisma.testimonial.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.testimonial.delete({ where: { id } });
  }

  private ensureExists(id: string) {
    return ensureFound(
      this.prisma.testimonial.findUnique({ where: { id } }),
      'Testimonial',
    );
  }
}
