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
import { applyDraftMode } from '../common/utils/entry-draft';
import {
  SiteContext,
  propertyBrandWhere,
  scopedPropertiesInclude,
} from '../common/site';

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

    const geo = propertyBrandWhere(site);
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
    const geo = propertyBrandWhere(site);
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
    const geo = propertyBrandWhere(site);
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
    const existing = await this.ensureExists(id);
    const data: Prisma.DeveloperUpdateInput = {};

    const { live, draft } = applyDraftMode(
      dto,
      ['description', 'shortDescription'] as const,
      dto.mode,
    );
    if (live.description !== undefined) data.description = live.description;
    if (live.shortDescription !== undefined)
      data.shortDescription = live.shortDescription;
    if (draft !== undefined) data.draft = draft;

    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.logo !== undefined) data.logo = dto.logo;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.citySlug !== undefined) data.citySlug = dto.citySlug;
    if (dto.website !== undefined) data.website = dto.website;
    if (dto.projectCount !== undefined) data.projectCount = dto.projectCount;
    if (dto.featured !== undefined) data.featured = dto.featured;
    if (dto.coverImage !== undefined) data.coverImage = dto.coverImage;

    const updated = await this.prisma.developer.update({ where: { id }, data });
    if (
      dto.logo !== undefined &&
      existing.logo &&
      existing.logo !== dto.logo
    ) {
      await this.uploadsService.deleteByPublicUrl(existing.logo, 'developers');
    }
    if (
      dto.coverImage !== undefined &&
      existing.coverImage &&
      existing.coverImage !== dto.coverImage
    ) {
      await this.uploadsService.deleteByPublicUrl(
        existing.coverImage,
        'developers',
      );
    }
    return updated;
  }

  async remove(id: string) {
    const existing = await this.ensureExists(id);
    const deleted = await this.prisma.developer.delete({ where: { id } });
    // Best-effort cleanup of any owned upload assets after the DB delete
    // succeeds. Static seed paths (/images/...) are filtered by extractStoragePath.
    await this.uploadsService.deleteByPublicUrl(existing.logo, 'developers');
    await this.uploadsService.deleteByPublicUrl(
      existing.coverImage,
      'developers',
    );
    return deleted;
  }

  /**
   * Recompute `Developer.projectCount` from the live `Property` table.
   * Returns the number of developers whose count actually changed so the
   * caller can show "fixed N counts" without surfacing no-op rebuilds.
   * Implementation: one groupBy + per-developer update inside a transaction
   * so a partial failure leaves the counts as they were.
   */
  async rebuildProjectCounts(): Promise<{ updated: number; checked: number }> {
    const grouped = await this.prisma.property.groupBy({
      by: ['developerId'],
      _count: { _all: true },
      where: { developerId: { not: null } },
    });
    const counts = new Map<string, number>();
    for (const row of grouped) {
      if (row.developerId) counts.set(row.developerId, row._count._all);
    }

    const developers = await this.prisma.developer.findMany({
      select: { id: true, projectCount: true },
    });

    const drift = developers
      .map((d) => ({
        id: d.id,
        current: d.projectCount,
        next: counts.get(d.id) ?? 0,
      }))
      .filter((d) => d.current !== d.next);

    if (drift.length === 0) {
      return { updated: 0, checked: developers.length };
    }

    await this.prisma.$transaction(
      drift.map((d) =>
        this.prisma.developer.update({
          where: { id: d.id },
          data: { projectCount: d.next },
        }),
      ),
    );

    this.logger.log(
      `Rebuilt projectCount for ${drift.length}/${developers.length} developers`,
    );
    return { updated: drift.length, checked: developers.length };
  }

  async uploadLogo(id: string, file: Express.Multer.File) {
    const existing = await this.ensureExists(id);
    const result = await this.uploadsService.uploadFile(file, 'developers');
    const updated = await this.prisma.developer.update({
      where: { id },
      data: { logo: result.publicUrl },
    });
    if (existing.logo && existing.logo !== result.publicUrl) {
      await this.uploadsService.deleteByPublicUrl(existing.logo, 'developers');
    }
    return updated;
  }

  private ensureExists(id: string) {
    return ensureFound(
      this.prisma.developer.findUnique({ where: { id } }),
      'Developer',
    );
  }
}
