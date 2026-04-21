import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
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

// Related-properties payload cap on agent list/detail endpoints. See the
// equivalent in developers.service.ts for rationale.
const RELATED_PROPERTIES_CAP = 12;
const UNPAGINATED_CAP = 100;

/** Sort token resolver. Defaults to lastName asc (directory-style). */
function resolveAgentSort(
  sort: string | undefined,
):
  | Prisma.AgentOrderByWithRelationInput
  | Prisma.AgentOrderByWithRelationInput[] {
  switch (sort) {
    case 'name_desc':
      return [{ lastName: 'desc' }, { firstName: 'desc' }];
    case 'newest':
      return { createdAt: 'desc' };
    case 'oldest':
      return { createdAt: 'asc' };
    case 'active':
      return [{ active: 'desc' }, { lastName: 'asc' }];
    case 'name_asc':
    default:
      return [{ lastName: 'asc' }, { firstName: 'asc' }];
  }
}

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  constructor(
    private prisma: PrismaService,
    private uploadsService: UploadsService,
    private siteConfig: SiteConfigService,
  ) {}

  async findAll(
    query: {
      active?: boolean;
      search?: string;
      sort?: string;
      page?: number;
      limit?: number;
      /**
       * When true, return only agents without an `adminUserId` link — used by
       * the SUPER_ADMIN Users page to populate the "link agent" dropdown when
       * creating/editing an AGENT account.
       */
      unlinked?: boolean;
    },
    site: SiteContext,
  ) {
    const where: Prisma.AgentWhereInput = {};
    if (query.active !== undefined) where.active = query.active;
    if (query.unlinked) where.adminUserId = null;
    if (query.search) {
      const s = query.search;
      where.OR = [
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { slug: { contains: s, mode: 'insensitive' } },
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
      // Attach the (single) invitation so the admin UI can render the
      // Active / Pending / Expired / No-login pill without a separate round
      // trip. `adminUserId` is already selected by default on Agent.
      invitation: {
        select: {
          id: true,
          status: true,
          expiresAt: true,
          emailSentAt: true,
        },
      },
    };
    const orderBy = resolveAgentSort(query.sort);

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
          this.prisma.agent.findMany({
            where,
            include,
            orderBy,
            skip,
            take,
          }),
        () => this.prisma.agent.count({ where }),
        page,
        limit,
      );
    }

    const rows = await this.prisma.agent.findMany({
      where,
      include,
      orderBy,
      take: UNPAGINATED_CAP,
    });
    if (rows.length === UNPAGINATED_CAP) {
      this.logger.warn(
        `Agents unpaginated cap hit (${UNPAGINATED_CAP}) — switch the caller to pagination.`,
      );
    }
    return rows;
  }

  async findById(id: string, site: SiteContext) {
    const geo = propertyGeoWhere(
      await resolveGeoScope(site, this.siteConfig),
    );
    return ensureFound(
      this.prisma.agent.findUnique({
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
      'Agent',
    );
  }

  async findBySlug(slug: string, site: SiteContext) {
    const geo = propertyGeoWhere(
      await resolveGeoScope(site, this.siteConfig),
    );
    return ensureFound(
      this.prisma.agent.findUnique({
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
      'Agent',
    );
  }

  async create(dto: CreateAgentDto) {
    await ensureSlugUnique(dto.slug, 'Agent', (slug) =>
      this.prisma.agent.findUnique({
        where: { slug },
        select: { id: true },
      }),
    );

    return this.prisma.agent.create({
      data: {
        slug: dto.slug,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        photo: dto.photo,
        bio: toJson(dto.bio),
        active: dto.active ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateAgentDto) {
    await this.ensureExists(id);
    const data: Prisma.AgentUpdateInput = {};

    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.photo !== undefined) data.photo = dto.photo;
    if (dto.bio !== undefined)
      data.bio = toJson(dto.bio);
    if (dto.active !== undefined) data.active = dto.active;

    return this.prisma.agent.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.agent.delete({ where: { id } });
  }

  async uploadPhoto(id: string, file: Express.Multer.File) {
    await this.ensureExists(id);
    const result = await this.uploadsService.uploadFile(file, 'agents');
    return this.prisma.agent.update({
      where: { id },
      data: { photo: result.publicUrl },
    });
  }

  private ensureExists(id: string) {
    return ensureFound(
      this.prisma.agent.findUnique({ where: { id } }),
      'Agent',
    );
  }
}
