import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { CreateDeveloperDto } from './dto/create-developer.dto';
import { UpdateDeveloperDto } from './dto/update-developer.dto';
import { ensureFound } from '../common/utils/ensure-found.util';
import { ensureSlugUnique } from '../common/utils/ensure-slug-unique.util';
import { paginate } from '../common/utils/pagination.util';
import { toJson } from '../common/utils/prisma-json';
import {
  SiteContext,
  propertyGeoWhere,
  resolveGeoScope,
  scopedPropertiesInclude,
} from '../common/site';
import { SiteConfigService } from '../site-config/site-config.service';

const UNPAGINATED_CAP = 100;

/**
 * Sort token resolver. Unknown or missing tokens fall back to alphabetical.
 * Multi-field tokens (e.g. `featured`) use an array to get tie-breaker order.
 */
function resolveDeveloperSort(
  sort: string | undefined,
):
  | Prisma.DeveloperOrderByWithRelationInput
  | Prisma.DeveloperOrderByWithRelationInput[] {
  switch (sort) {
    case 'name_desc':
      return { name: 'desc' };
    case 'newest':
      return { createdAt: 'desc' };
    case 'oldest':
      return { createdAt: 'asc' };
    case 'featured':
      return [{ featured: 'desc' }, { name: 'asc' }];
    case 'name_asc':
    default:
      return { name: 'asc' };
  }
}
// Cap the related-properties payload on developer list/detail endpoints. A
// developer with hundreds of properties would otherwise balloon every row in
// the listing response. Callers that need the full list use
// `GET /properties?developerId=...` with its own pagination.
const RELATED_PROPERTIES_CAP = 12;

@Injectable()
export class DevelopersService {
  private readonly logger = new Logger(DevelopersService.name);

  constructor(
    private prisma: PrismaService,
    private uploadsService: UploadsService,
    private siteConfig: SiteConfigService,
  ) {}

  async findAll(
    query: {
      featured?: boolean;
      city?: string;
      search?: string;
      sort?: string;
      page?: number;
      limit?: number;
    },
    site: SiteContext,
  ) {
    const where: Prisma.DeveloperWhereInput = {};
    if (query.featured !== undefined) where.featured = query.featured;
    if (query.city) where.citySlug = query.city;
    if (query.search) {
      const s = query.search;
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { slug: { contains: s, mode: 'insensitive' } },
        { city: { contains: s, mode: 'insensitive' } },
      ];
    }

    const geo = propertyGeoWhere(
      await resolveGeoScope(site, this.siteConfig),
    );
    const include = {
      properties: scopedPropertiesInclude(
        site,
        {
          select: { id: true, slug: true, title: true },
          take: RELATED_PROPERTIES_CAP,
          orderBy: { createdAt: 'desc' as const },
        },
        geo,
      ),
    };

    const orderBy = resolveDeveloperSort(query.sort);

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
          this.prisma.developer.findMany({
            where,
            include,
            orderBy,
            skip,
            take,
          }),
        () => this.prisma.developer.count({ where }),
        page,
        limit,
      );
    }

    const rows = await this.prisma.developer.findMany({
      where,
      include,
      orderBy,
      take: UNPAGINATED_CAP,
    });
    if (rows.length === UNPAGINATED_CAP) {
      this.logger.warn(
        `Developers unpaginated cap hit (${UNPAGINATED_CAP}) — switch the caller to pagination.`,
      );
    }
    return rows;
  }

  async findById(id: string, site: SiteContext) {
    const geo = propertyGeoWhere(
      await resolveGeoScope(site, this.siteConfig),
    );
    return ensureFound(
      this.prisma.developer.findUnique({
        where: { id },
        include: {
          properties: scopedPropertiesInclude(
            site,
            {
              select: { id: true, slug: true, title: true },
              take: RELATED_PROPERTIES_CAP,
              orderBy: { createdAt: 'desc' as const },
            },
            geo,
          ),
        },
      }),
      'Developer',
    );
  }

  async findBySlug(slug: string, site: SiteContext) {
    const geo = propertyGeoWhere(
      await resolveGeoScope(site, this.siteConfig),
    );
    return ensureFound(
      this.prisma.developer.findUnique({
        where: { slug },
        include: {
          properties: scopedPropertiesInclude(
            site,
            {
              include: { images: { orderBy: { sortOrder: 'asc' as const } } },
              take: RELATED_PROPERTIES_CAP,
              orderBy: { createdAt: 'desc' as const },
            },
            geo,
          ),
        },
      }),
      'Developer',
    );
  }

  async create(dto: CreateDeveloperDto) {
    await ensureSlugUnique(dto.slug, 'Developer', (slug) =>
      this.prisma.developer.findUnique({
        where: { slug },
        select: { id: true },
      }),
    );

    return this.prisma.developer.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        logo: dto.logo ?? '/uploads/placeholder-logo.png',
        description: toJson(dto.description),
        shortDescription: toJson(dto.shortDescription),
        city: dto.city,
        citySlug: dto.citySlug,
        website: dto.website,
        projectCount: dto.projectCount ?? 0,
        featured: dto.featured ?? false,
      },
    });
  }

  async update(id: string, dto: UpdateDeveloperDto) {
    await this.ensureExists(id);
    const data: Prisma.DeveloperUpdateInput = {};

    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.logo !== undefined) data.logo = dto.logo;
    if (dto.description !== undefined)
      data.description = toJson(dto.description);
    if (dto.shortDescription !== undefined)
      data.shortDescription = toJson(dto.shortDescription);
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.citySlug !== undefined) data.citySlug = dto.citySlug;
    if (dto.website !== undefined) data.website = dto.website;
    if (dto.projectCount !== undefined) data.projectCount = dto.projectCount;
    if (dto.featured !== undefined) data.featured = dto.featured;

    return this.prisma.developer.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.developer.delete({ where: { id } });
  }

  async uploadLogo(id: string, file: Express.Multer.File) {
    await this.ensureExists(id);
    const result = await this.uploadsService.uploadFile(file, 'developers');
    return this.prisma.developer.update({
      where: { id },
      data: { logo: result.publicUrl },
    });
  }

  private ensureExists(id: string) {
    return ensureFound(
      this.prisma.developer.findUnique({ where: { id } }),
      'Developer',
    );
  }
}
