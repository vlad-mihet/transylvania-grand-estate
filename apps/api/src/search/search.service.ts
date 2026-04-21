import { Injectable, Logger } from '@nestjs/common';
import { AdminRole, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SiteConfigService } from '../site-config/site-config.service';
import {
  SiteContext,
  cityGeoWhere,
  propertyGeoWhere,
  resolveGeoScope,
  tierScopeFilter,
} from '../common/site';
import type { CurrentUserPayload } from '../common/decorators/user.decorator';
import type {
  SearchQueryInput,
  SearchGroup,
  SearchResponse,
  SearchEntityType,
} from '@tge/types/schemas/search';

/**
 * Which entity types a given role can surface in global search.
 * AGENT is intentionally narrow — they shouldn't see bank rates, other users,
 * or testimonials in their quick-find. Anonymous / unknown roles get nothing.
 */
const ROLE_ALLOWED: Record<AdminRole, readonly SearchEntityType[]> = {
  SUPER_ADMIN: [
    'property',
    'agent',
    'developer',
    'city',
    'county',
    'article',
    'inquiry',
    'testimonial',
    'bankRate',
    'user',
  ],
  ADMIN: [
    'property',
    'agent',
    'developer',
    'city',
    'county',
    'article',
    'inquiry',
    'testimonial',
    'bankRate',
    'user',
  ],
  EDITOR: [
    'property',
    'agent',
    'developer',
    'city',
    'county',
    'article',
    'inquiry',
    'testimonial',
    'bankRate',
  ],
  AGENT: ['property', 'city', 'developer', 'inquiry'],
};

// Sentinel used to clamp AGENT queries when the account isn't linked to an
// Agent record. A random-looking string avoids collision with real UUIDs.
const NO_AGENT_SENTINEL = '__no-agent__';

function localizedTitle(
  value: Prisma.JsonValue | null | undefined,
  fallback: string,
): string {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const ro = typeof obj.ro === 'string' ? obj.ro.trim() : '';
    if (ro) return ro;
    const en = typeof obj.en === 'string' ? obj.en.trim() : '';
    if (en) return en;
  }
  return fallback;
}

/**
 * Take `limit + 1`, slice to `limit`, report `hasMore` from the overflow.
 * Classic trick to avoid a second round-trip for `count()` — the type-ahead
 * UI only needs the first N plus a "there's more" signal.
 */
function applyOverflow<T>(rows: T[], limit: number): { items: T[]; hasMore: boolean } {
  if (rows.length > limit) {
    return { items: rows.slice(0, limit), hasMore: true };
  }
  return { items: rows, hasMore: false };
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly siteConfig: SiteConfigService,
  ) {}

  async search(
    dto: SearchQueryInput,
    site: SiteContext,
    user: CurrentUserPayload | null,
  ): Promise<SearchResponse> {
    const q = dto.q.trim();
    const limit = dto.limit;

    // If the request has no authenticated user but passes the controller
    // guards (shouldn't happen with @Roles — defensive only), return empty.
    const role = user?.role;
    const allowed = new Set<SearchEntityType>(
      role ? ROLE_ALLOWED[role] ?? [] : [],
    );
    if (allowed.size === 0) {
      return { query: q, groups: [] };
    }

    const requested =
      dto.types && dto.types.length > 0
        ? new Set(dto.types.filter((t) => allowed.has(t)))
        : allowed;

    const scope = await resolveGeoScope(site, this.siteConfig);
    const propertyGeo = propertyGeoWhere(scope);
    const cityGeo = cityGeoWhere(scope);

    const tasks: Array<{
      entity: SearchEntityType;
      run: () => Promise<SearchGroup>;
    }> = [];

    if (requested.has('property')) {
      tasks.push({
        entity: 'property',
        run: () => this.searchProperties(q, limit, site, user, propertyGeo),
      });
    }
    if (requested.has('agent')) {
      tasks.push({ entity: 'agent', run: () => this.searchAgents(q, limit) });
    }
    if (requested.has('developer')) {
      tasks.push({
        entity: 'developer',
        run: () => this.searchDevelopers(q, limit),
      });
    }
    if (requested.has('city')) {
      tasks.push({
        entity: 'city',
        run: () => this.searchCities(q, limit, cityGeo),
      });
    }
    if (requested.has('county')) {
      tasks.push({ entity: 'county', run: () => this.searchCounties(q, limit) });
    }
    if (requested.has('article')) {
      tasks.push({
        entity: 'article',
        run: () => this.searchArticles(q, limit),
      });
    }
    if (requested.has('inquiry')) {
      tasks.push({
        entity: 'inquiry',
        run: () => this.searchInquiries(q, limit, user),
      });
    }
    if (requested.has('testimonial')) {
      tasks.push({
        entity: 'testimonial',
        run: () => this.searchTestimonials(q, limit),
      });
    }
    if (requested.has('bankRate')) {
      tasks.push({
        entity: 'bankRate',
        run: () => this.searchBankRates(q, limit),
      });
    }
    if (requested.has('user')) {
      tasks.push({ entity: 'user', run: () => this.searchUsers(q, limit) });
    }

    // Partial-failure tolerance. A broken index on one entity shouldn't take
    // down the whole search UI — we log and return an empty group for the
    // offender so the surviving groups still render.
    const settled = await Promise.allSettled(tasks.map((t) => t.run()));
    const groups: SearchGroup[] = [];
    settled.forEach((result, idx) => {
      const entity = tasks[idx].entity;
      if (result.status === 'fulfilled') {
        if (result.value.items.length > 0) groups.push(result.value);
      } else {
        this.logger.error(
          { err: result.reason, entity, queryLength: q.length },
          `Global search failed for entity "${entity}"`,
        );
      }
    });

    return { query: q, groups };
  }

  private async searchProperties(
    q: string,
    limit: number,
    site: SiteContext,
    user: CurrentUserPayload | null,
    geo: Prisma.PropertyWhereInput | undefined,
  ): Promise<SearchGroup> {
    const where: Prisma.PropertyWhereInput = {
      OR: [
        { slug: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { neighborhood: { contains: q, mode: 'insensitive' } },
        { title: { path: ['ro'], string_contains: q } },
        { title: { path: ['en'], string_contains: q } },
      ],
    };

    const tier = tierScopeFilter(site);
    if (tier !== undefined) where.tier = tier;
    if (geo) where.AND = [geo];

    if (user?.role === AdminRole.AGENT) {
      where.agentId = user.agentId ?? NO_AGENT_SENTINEL;
    }

    const rows = await this.prisma.property.findMany({
      where,
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        slug: true,
        title: true,
        city: true,
        neighborhood: true,
        tier: true,
        images: {
          where: { isHero: true },
          select: { src: true },
          take: 1,
        },
      },
    });

    const { items, hasMore } = applyOverflow(rows, limit);

    return {
      entity: 'property',
      hasMore,
      items: items.map((r) => ({
        id: r.id,
        entity: 'property' as const,
        title: localizedTitle(r.title, r.slug),
        subtitle: [r.neighborhood, r.city].filter(Boolean).join(' · ') || null,
        href: `/properties/${r.id}`,
        imageUrl: r.images[0]?.src ?? null,
        badge: r.tier,
      })),
    };
  }

  private async searchAgents(q: string, limit: number): Promise<SearchGroup> {
    const where: Prisma.AgentWhereInput = {
      OR: [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ],
    };
    const rows = await this.prisma.agent.findMany({
      where,
      take: limit + 1,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        photo: true,
        active: true,
      },
    });
    const { items, hasMore } = applyOverflow(rows, limit);
    return {
      entity: 'agent',
      hasMore,
      items: items.map((r) => ({
        id: r.id,
        entity: 'agent' as const,
        title: `${r.firstName} ${r.lastName}`.trim() || r.email,
        subtitle: r.email,
        href: `/agents/${r.id}`,
        imageUrl: r.photo,
        badge: r.active ? null : 'inactive',
      })),
    };
  }

  private async searchDevelopers(
    q: string,
    limit: number,
  ): Promise<SearchGroup> {
    const where: Prisma.DeveloperWhereInput = {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { tagline: { path: ['ro'], string_contains: q } },
        { tagline: { path: ['en'], string_contains: q } },
      ],
    };
    const rows = await this.prisma.developer.findMany({
      where,
      take: limit + 1,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        city: true,
        logo: true,
        featured: true,
        projectCount: true,
      },
    });
    const { items, hasMore } = applyOverflow(rows, limit);
    return {
      entity: 'developer',
      hasMore,
      items: items.map((r) => ({
        id: r.id,
        entity: 'developer' as const,
        title: r.name,
        subtitle:
          [r.city, r.projectCount > 0 ? `${r.projectCount} projects` : null]
            .filter(Boolean)
            .join(' · ') || null,
        href: `/developers/${r.id}`,
        imageUrl: r.logo,
        badge: r.featured ? 'featured' : null,
      })),
    };
  }

  private async searchCities(
    q: string,
    limit: number,
    cityGeo: Prisma.CityWhereInput | undefined,
  ): Promise<SearchGroup> {
    const where: Prisma.CityWhereInput = {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
      ],
    };
    if (cityGeo) where.AND = [cityGeo];
    const rows = await this.prisma.city.findMany({
      where,
      take: limit + 1,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        image: true,
        propertyCount: true,
        county: { select: { name: true } },
      },
    });
    const { items, hasMore } = applyOverflow(rows, limit);
    return {
      entity: 'city',
      hasMore,
      items: items.map((r) => ({
        id: r.id,
        entity: 'city' as const,
        title: r.name,
        subtitle:
          [
            r.county?.name,
            r.propertyCount > 0 ? `${r.propertyCount} listings` : null,
          ]
            .filter(Boolean)
            .join(' · ') || null,
        href: `/cities/${r.id}`,
        imageUrl: r.image,
        badge: null,
      })),
    };
  }

  private async searchCounties(q: string, limit: number): Promise<SearchGroup> {
    const where: Prisma.CountyWhereInput = {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
      ],
    };
    const rows = await this.prisma.county.findMany({
      where,
      take: limit + 1,
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true, propertyCount: true },
    });
    const { items, hasMore } = applyOverflow(rows, limit);
    return {
      entity: 'county',
      hasMore,
      items: items.map((r) => ({
        id: r.id,
        entity: 'county' as const,
        title: r.name,
        subtitle:
          [r.code, r.propertyCount > 0 ? `${r.propertyCount} listings` : null]
            .filter(Boolean)
            .join(' · ') || null,
        href: `/counties`,
        imageUrl: null,
        badge: null,
      })),
    };
  }

  private async searchArticles(q: string, limit: number): Promise<SearchGroup> {
    const where: Prisma.ArticleWhereInput = {
      OR: [
        { slug: { contains: q, mode: 'insensitive' } },
        { authorName: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
        { title: { path: ['ro'], string_contains: q } },
        { title: { path: ['en'], string_contains: q } },
      ],
    };
    const rows = await this.prisma.article.findMany({
      where,
      take: limit + 1,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        slug: true,
        title: true,
        category: true,
        status: true,
        coverImage: true,
      },
    });
    const { items, hasMore } = applyOverflow(rows, limit);
    return {
      entity: 'article',
      hasMore,
      items: items.map((r) => ({
        id: r.id,
        entity: 'article' as const,
        title: localizedTitle(r.title, r.slug),
        subtitle: r.category,
        href: `/articles`,
        imageUrl: r.coverImage,
        badge: r.status,
      })),
    };
  }

  private async searchInquiries(
    q: string,
    limit: number,
    user: CurrentUserPayload | null,
  ): Promise<SearchGroup> {
    const where: Prisma.InquiryWhereInput = {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { message: { contains: q, mode: 'insensitive' } },
        { entityName: { contains: q, mode: 'insensitive' } },
      ],
    };
    if (user?.role === AdminRole.AGENT) {
      where.property = { agentId: user.agentId ?? NO_AGENT_SENTINEL };
    }
    const rows = await this.prisma.inquiry.findMany({
      where,
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        type: true,
        entityName: true,
      },
    });
    const { items, hasMore } = applyOverflow(rows, limit);
    return {
      entity: 'inquiry',
      hasMore,
      items: items.map((r) => ({
        id: r.id,
        entity: 'inquiry' as const,
        title: r.name,
        subtitle: [r.email, r.entityName].filter(Boolean).join(' · ') || r.type,
        href: `/inquiries`,
        imageUrl: null,
        badge: r.status,
      })),
    };
  }

  private async searchTestimonials(
    q: string,
    limit: number,
  ): Promise<SearchGroup> {
    const where: Prisma.TestimonialWhereInput = {
      OR: [
        { clientName: { contains: q, mode: 'insensitive' } },
        { location: { contains: q, mode: 'insensitive' } },
        { propertyType: { contains: q, mode: 'insensitive' } },
      ],
    };
    const rows = await this.prisma.testimonial.findMany({
      where,
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        clientName: true,
        location: true,
        propertyType: true,
        rating: true,
      },
    });
    const { items, hasMore } = applyOverflow(rows, limit);
    return {
      entity: 'testimonial',
      hasMore,
      items: items.map((r) => ({
        id: r.id,
        entity: 'testimonial' as const,
        title: r.clientName,
        subtitle:
          [r.location, r.propertyType].filter(Boolean).join(' · ') || null,
        href: `/testimonials/${r.id}`,
        imageUrl: null,
        badge: `${r.rating}★`,
      })),
    };
  }

  private async searchBankRates(q: string, limit: number): Promise<SearchGroup> {
    const where: Prisma.BankRateWhereInput = {
      OR: [
        { bankName: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
      ],
    };
    const rows = await this.prisma.bankRate.findMany({
      where,
      take: limit + 1,
      orderBy: [{ active: 'desc' }, { bankName: 'asc' }],
      select: {
        id: true,
        bankName: true,
        rate: true,
        rateType: true,
        active: true,
      },
    });
    const { items, hasMore } = applyOverflow(rows, limit);
    return {
      entity: 'bankRate',
      hasMore,
      items: items.map((r) => ({
        id: r.id,
        entity: 'bankRate' as const,
        title: r.bankName,
        subtitle: `${r.rate.toFixed(2)}% · ${r.rateType}`,
        href: `/bank-rates/${r.id}`,
        imageUrl: null,
        badge: r.active ? null : 'inactive',
      })),
    };
  }

  private async searchUsers(q: string, limit: number): Promise<SearchGroup> {
    const where: Prisma.AdminUserWhereInput = {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ],
    };
    const rows = await this.prisma.adminUser.findMany({
      where,
      take: limit + 1,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
    const { items, hasMore } = applyOverflow(rows, limit);
    return {
      entity: 'user',
      hasMore,
      items: items.map((r) => ({
        id: r.id,
        entity: 'user' as const,
        title: r.name || r.email,
        subtitle: r.email,
        href: `/users`,
        imageUrl: null,
        badge: r.role,
      })),
    };
  }
}
