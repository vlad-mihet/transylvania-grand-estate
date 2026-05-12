import { Injectable, Logger } from '@nestjs/common';
import { AdminRole, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  SiteContext,
  cityBrandWhere,
  propertyBrandWhere,
  tierScopeFilter,
} from '../common/site';
import type { CurrentUserPayload } from '../common/decorators/user.decorator';
import { localizedJsonContainsAny } from '../common/utils/localized-search';
import type {
  SearchCountsResponse,
  SearchEntityType,
  SearchGroup,
  SearchQueryInput,
  SearchResponse,
  SearchResultItem,
} from '@tge/types/schemas/search';

/**
 * Which entity types a given role can surface in global search.
 * AGENT is intentionally narrow — they shouldn't see bank rates, other users,
 * or testimonials in their quick-find. Anonymous / unknown roles get nothing.
 */
export const ROLE_ALLOWED: Record<AdminRole, readonly SearchEntityType[]> = {
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

/**
 * Minimum top score required to promote a candidate to the "Top result" slot.
 * Score 3 = word-boundary match; score 4 = prefix; score 5 = exact. Below 3
 * (i.e. plain substring) we'd be promoting weak matches that could surprise
 * the user — e.g. searching "ana" pulling up "panama" properties.
 */
const TOP_RESULT_MIN_SCORE = 3;

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
 * Score a result row against the query. Higher is better. The list-page
 * orderings (`createdAt desc`, `name asc`) are the natural tiebreaker — the
 * scorer only re-shuffles within a per-entity slice that's already been
 * trimmed to ~10 rows, so this stays cheap and predictable.
 *
 *  5 — exact match on any indexed field
 *  4 — prefix match on title/name
 *  3 — word-boundary match anywhere
 *  2 — substring match (the floor — every row Prisma returned was a substring
 *      match against SOME field, so anything that ends up here at all gets ≥ 2)
 */
function scoreRow(needle: string, haystacks: ReadonlyArray<string | null | undefined>): number {
  const q = needle.toLowerCase().trim();
  if (!q) return 0;
  let best = 2;
  for (const raw of haystacks) {
    if (!raw) continue;
    const h = raw.toLowerCase();
    if (h === q) return 5;
    if (h.startsWith(q)) best = Math.max(best, 4);
    else if (h.includes(` ${q}`) || h.includes(`-${q}`)) best = Math.max(best, 3);
  }
  return best;
}

/**
 * Internal per-entity envelope. The orchestrator needs the top scored
 * candidate (and its score) from each entity so it can pick a global winner
 * for the response-level `topResult`. The score doesn't escape the service —
 * only `group` ends up on the wire.
 */
interface EntitySearchResult {
  group: SearchGroup;
  topCandidate: SearchResultItem | null;
  topScore: number;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Total counts per entity type the caller's role is allowed to see, applying
   * the same brand + AGENT ownership clamps as `search()` (just without the
   * query predicate). Drives the rail's always-visible "total inventory"
   * badges — distinct from per-query result counts which `search()` returns.
   *
   * Cost: one Prisma `count()` per allowed entity, fanned out in parallel.
   * Indexed in every case (Prisma's `count` on the same indexed `where` we
   * already use elsewhere), so the wall-clock is dominated by the slowest
   * single count and small.
   */
  async getCounts(
    site: SiteContext,
    user: CurrentUserPayload | null,
  ): Promise<SearchCountsResponse> {
    const role = user?.role;
    const allowed = new Set<SearchEntityType>(
      role ? ROLE_ALLOWED[role] ?? [] : [],
    );
    if (allowed.size === 0) return { counts: [] };

    const tier = tierScopeFilter(site);
    const propertyGeo = propertyBrandWhere(site);
    const cityGeo = cityBrandWhere(site);

    const tasks: Array<{ entity: SearchEntityType; run: () => Promise<number> }> = [];

    if (allowed.has('property')) {
      tasks.push({
        entity: 'property',
        run: () => {
          const where: Prisma.PropertyWhereInput = {};
          if (tier !== undefined) where.tier = tier;
          if (propertyGeo) where.AND = [propertyGeo];
          if (user?.role === AdminRole.AGENT) {
            where.agentId = user.agentId ?? NO_AGENT_SENTINEL;
          }
          return this.prisma.property.count({ where });
        },
      });
    }
    if (allowed.has('agent')) {
      tasks.push({ entity: 'agent', run: () => this.prisma.agent.count() });
    }
    if (allowed.has('developer')) {
      tasks.push({
        entity: 'developer',
        run: () => this.prisma.developer.count(),
      });
    }
    if (allowed.has('city')) {
      tasks.push({
        entity: 'city',
        run: () => this.prisma.city.count({ where: cityGeo ?? {} }),
      });
    }
    if (allowed.has('county')) {
      tasks.push({ entity: 'county', run: () => this.prisma.county.count() });
    }
    if (allowed.has('article')) {
      tasks.push({ entity: 'article', run: () => this.prisma.article.count() });
    }
    if (allowed.has('inquiry')) {
      tasks.push({
        entity: 'inquiry',
        run: () => {
          const where: Prisma.InquiryWhereInput = {};
          if (user?.role === AdminRole.AGENT) {
            where.property = { agentId: user.agentId ?? NO_AGENT_SENTINEL };
          }
          return this.prisma.inquiry.count({ where });
        },
      });
    }
    if (allowed.has('testimonial')) {
      tasks.push({
        entity: 'testimonial',
        run: () => this.prisma.testimonial.count(),
      });
    }
    if (allowed.has('bankRate')) {
      tasks.push({
        entity: 'bankRate',
        run: () => this.prisma.bankRate.count(),
      });
    }
    if (allowed.has('user')) {
      tasks.push({ entity: 'user', run: () => this.prisma.adminUser.count() });
    }

    const settled = await Promise.allSettled(tasks.map((t) => t.run()));
    const counts: SearchCountsResponse['counts'] = [];
    settled.forEach((result, idx) => {
      const entity = tasks[idx].entity;
      if (result.status === 'fulfilled') {
        counts.push({ entity, count: result.value });
      } else {
        this.logger.error(
          { err: result.reason, entity },
          `Entity count failed for "${entity}"`,
        );
      }
    });
    return { counts };
  }

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

    const propertyGeo = propertyBrandWhere(site);
    const cityGeo = cityBrandWhere(site);

    const tasks: Array<{
      entity: SearchEntityType;
      run: () => Promise<EntitySearchResult>;
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
    // down the whole search UI — we log and skip the offender so the
    // surviving groups still render.
    const settled = await Promise.allSettled(tasks.map((t) => t.run()));
    const fulfilled: EntitySearchResult[] = [];
    settled.forEach((result, idx) => {
      const entity = tasks[idx].entity;
      if (result.status === 'fulfilled') {
        if (result.value.group.items.length > 0) fulfilled.push(result.value);
      } else {
        this.logger.error(
          { err: result.reason, entity, queryLength: q.length },
          `Global search failed for entity "${entity}"`,
        );
      }
    });

    const groups = fulfilled.map((f) => f.group);

    // Top-result eligibility:
    //   1. Caller didn't narrow scope (no `types` filter) — otherwise the
    //      "single best across all entities" framing is misleading; the user
    //      already restricted what they want.
    //   2. At least two distinct entity groups produced hits — promoting one
    //      with only one group is just visual duplication.
    //   3. The winning score is at least TOP_RESULT_MIN_SCORE (word-boundary
    //      or better) — substring-only matches aren't strong enough to lead.
    const scopeIsAll = !dto.types || dto.types.length === 0;
    let topResult: SearchResultItem | null = null;
    if (scopeIsAll && fulfilled.length >= 2) {
      const winner = fulfilled.reduce<EntitySearchResult | null>(
        (best, curr) =>
          curr.topCandidate && curr.topScore > (best?.topScore ?? 0) ? curr : best,
        null,
      );
      if (
        winner &&
        winner.topCandidate &&
        winner.topScore >= TOP_RESULT_MIN_SCORE
      ) {
        topResult = winner.topCandidate;
      }
    }

    return { query: q, groups, topResult };
  }

  private async searchProperties(
    q: string,
    limit: number,
    site: SiteContext,
    user: CurrentUserPayload | null,
    geo: Prisma.PropertyWhereInput | undefined,
  ): Promise<EntitySearchResult> {
    const where: Prisma.PropertyWhereInput = {
      OR: [
        { slug: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { neighborhood: { contains: q, mode: 'insensitive' } },
        ...localizedJsonContainsAny('title', q).map((filter) => ({
          title: filter,
        })),
      ],
    };

    const tier = tierScopeFilter(site);
    if (tier !== undefined) where.tier = tier;
    if (geo) where.AND = [geo];

    if (user?.role === AdminRole.AGENT) {
      where.agentId = user.agentId ?? NO_AGENT_SENTINEL;
    }

    const [rows, total] = await Promise.all([
      this.prisma.property.findMany({
        where,
        // Fetch a wider window than `limit` so the scorer has material to
        // re-rank. 4× the visible slice is generous without inflating
        // payloads — for limit=8 that's 32 rows of skinny columns.
        take: limit * 4,
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
      }),
      this.prisma.property.count({ where }),
    ]);

    const scored = rows
      .map((r) => ({
        row: r,
        score: scoreRow(q, [r.slug, r.city, r.neighborhood, localizedTitle(r.title, '')]),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const items: SearchResultItem[] = scored.map(({ row: r }) => ({
      id: r.id,
      entity: 'property' as const,
      title: localizedTitle(r.title, r.slug),
      subtitle: [r.neighborhood, r.city].filter(Boolean).join(' · ') || null,
      href: `/properties/${r.id}`,
      imageUrl: r.images[0]?.src ?? null,
      badge: r.tier,
    }));

    return {
      group: { entity: 'property', total, items },
      topCandidate: items[0] ?? null,
      topScore: scored[0]?.score ?? 0,
    };
  }

  private async searchAgents(q: string, limit: number): Promise<EntitySearchResult> {
    const where: Prisma.AgentWhereInput = {
      OR: [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ],
    };
    const [rows, total] = await Promise.all([
      this.prisma.agent.findMany({
        where,
        take: limit * 4,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          slug: true,
          photo: true,
          active: true,
        },
      }),
      this.prisma.agent.count({ where }),
    ]);
    const scored = rows
      .map((r) => ({
        row: r,
        score: scoreRow(q, [
          r.firstName,
          r.lastName,
          `${r.firstName} ${r.lastName}`,
          r.email,
          r.slug,
        ]),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const items: SearchResultItem[] = scored.map(({ row: r }) => ({
      id: r.id,
      entity: 'agent' as const,
      title: `${r.firstName} ${r.lastName}`.trim() || r.email,
      subtitle: r.email,
      // `/people/agents/<id>` is the canonical agent detail route since
      // the directory consolidation in the QA Phase-2 campaign (the legacy
      // `/agents/...` routes were removed).
      href: `/people/agents/${r.id}`,
      imageUrl: r.photo,
      badge: r.active ? null : 'inactive',
    }));

    return {
      group: { entity: 'agent', total, items },
      topCandidate: items[0] ?? null,
      topScore: scored[0]?.score ?? 0,
    };
  }

  private async searchDevelopers(
    q: string,
    limit: number,
  ): Promise<EntitySearchResult> {
    const where: Prisma.DeveloperWhereInput = {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        ...localizedJsonContainsAny('tagline', q).map((filter) => ({
          tagline: filter,
        })),
      ],
    };
    const [rows, total] = await Promise.all([
      this.prisma.developer.findMany({
        where,
        take: limit * 4,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          logo: true,
          featured: true,
          projectCount: true,
        },
      }),
      this.prisma.developer.count({ where }),
    ]);
    const scored = rows
      .map((r) => ({ row: r, score: scoreRow(q, [r.name, r.slug, r.city]) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const items: SearchResultItem[] = scored.map(({ row: r }) => ({
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
    }));

    return {
      group: { entity: 'developer', total, items },
      topCandidate: items[0] ?? null,
      topScore: scored[0]?.score ?? 0,
    };
  }

  private async searchCities(
    q: string,
    limit: number,
    cityGeo: Prisma.CityWhereInput | undefined,
  ): Promise<EntitySearchResult> {
    const where: Prisma.CityWhereInput = {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
      ],
    };
    if (cityGeo) where.AND = [cityGeo];
    const [rows, total] = await Promise.all([
      this.prisma.city.findMany({
        where,
        take: limit * 4,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          image: true,
          propertyCount: true,
          county: { select: { name: true } },
        },
      }),
      this.prisma.city.count({ where }),
    ]);
    const scored = rows
      .map((r) => ({ row: r, score: scoreRow(q, [r.name, r.slug]) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const items: SearchResultItem[] = scored.map(({ row: r }) => ({
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
    }));

    return {
      group: { entity: 'city', total, items },
      topCandidate: items[0] ?? null,
      topScore: scored[0]?.score ?? 0,
    };
  }

  private async searchCounties(q: string, limit: number): Promise<EntitySearchResult> {
    const where: Prisma.CountyWhereInput = {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
      ],
    };
    const [rows, total] = await Promise.all([
      this.prisma.county.findMany({
        where,
        take: limit * 4,
        orderBy: { name: 'asc' },
        select: { id: true, name: true, slug: true, code: true, propertyCount: true },
      }),
      this.prisma.county.count({ where }),
    ]);
    const scored = rows
      .map((r) => ({ row: r, score: scoreRow(q, [r.name, r.slug, r.code]) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const items: SearchResultItem[] = scored.map(({ row: r }) => ({
      id: r.id,
      entity: 'county' as const,
      title: r.name,
      subtitle:
        [r.code, r.propertyCount > 0 ? `${r.propertyCount} listings` : null]
          .filter(Boolean)
          .join(' · ') || null,
      // Counties don't have a detail page (only a list with peek/edit
      // dialogs), so we deep-link to the list with a `?focus=` query param
      // that the list page can use to auto-open the edit dialog.
      href: `/counties?focus=${r.id}`,
      imageUrl: null,
      badge: null,
    }));

    return {
      group: { entity: 'county', total, items },
      topCandidate: items[0] ?? null,
      topScore: scored[0]?.score ?? 0,
    };
  }

  private async searchArticles(q: string, limit: number): Promise<EntitySearchResult> {
    // Article drafts ARE intentionally included for ADMIN/EDITOR — editors
    // need to find their in-progress drafts via search. The `status` field
    // surfaces as a badge so a draft is visually distinguishable from a
    // published article. AGENT role isn't permitted articles (ROLE_ALLOWED
    // table), so no role-conditional filter is needed here.
    const where: Prisma.ArticleWhereInput = {
      OR: [
        { slug: { contains: q, mode: 'insensitive' } },
        { authorName: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
        ...localizedJsonContainsAny('title', q).map((filter) => ({
          title: filter,
        })),
      ],
    };
    const [rows, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        take: limit * 4,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          slug: true,
          title: true,
          category: true,
          status: true,
          coverImage: true,
        },
      }),
      this.prisma.article.count({ where }),
    ]);
    const scored = rows
      .map((r) => ({
        row: r,
        score: scoreRow(q, [r.slug, r.category, localizedTitle(r.title, '')]),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const items: SearchResultItem[] = scored.map(({ row: r }) => ({
      id: r.id,
      entity: 'article' as const,
      title: localizedTitle(r.title, r.slug),
      subtitle: r.category,
      // Articles are slug-keyed; detail route is `/articles/[slug]`.
      href: `/articles/${r.slug}`,
      imageUrl: r.coverImage,
      badge: r.status,
    }));

    return {
      group: { entity: 'article', total, items },
      topCandidate: items[0] ?? null,
      topScore: scored[0]?.score ?? 0,
    };
  }

  private async searchInquiries(
    q: string,
    limit: number,
    user: CurrentUserPayload | null,
  ): Promise<EntitySearchResult> {
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
    const [rows, total] = await Promise.all([
      this.prisma.inquiry.findMany({
        where,
        take: limit * 4,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          type: true,
          entityName: true,
        },
      }),
      this.prisma.inquiry.count({ where }),
    ]);
    const scored = rows
      .map((r) => ({
        row: r,
        score: scoreRow(q, [r.name, r.email, r.entityName]),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const items: SearchResultItem[] = scored.map(({ row: r }) => ({
      id: r.id,
      entity: 'inquiry' as const,
      title: r.name,
      subtitle: [r.email, r.entityName].filter(Boolean).join(' · ') || r.type,
      // No detail page — deep-link to the list with `?focus=` so the list
      // can auto-open the existing peek sheet for the inquiry.
      href: `/inquiries?focus=${r.id}`,
      imageUrl: null,
      badge: r.status,
    }));

    return {
      group: { entity: 'inquiry', total, items },
      topCandidate: items[0] ?? null,
      topScore: scored[0]?.score ?? 0,
    };
  }

  private async searchTestimonials(
    q: string,
    limit: number,
  ): Promise<EntitySearchResult> {
    const where: Prisma.TestimonialWhereInput = {
      OR: [
        { clientName: { contains: q, mode: 'insensitive' } },
        { location: { contains: q, mode: 'insensitive' } },
        { propertyType: { contains: q, mode: 'insensitive' } },
      ],
    };
    const [rows, total] = await Promise.all([
      this.prisma.testimonial.findMany({
        where,
        take: limit * 4,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          clientName: true,
          location: true,
          propertyType: true,
          rating: true,
        },
      }),
      this.prisma.testimonial.count({ where }),
    ]);
    const scored = rows
      .map((r) => ({
        row: r,
        score: scoreRow(q, [r.clientName, r.location, r.propertyType]),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const items: SearchResultItem[] = scored.map(({ row: r }) => ({
      id: r.id,
      entity: 'testimonial' as const,
      title: r.clientName,
      subtitle:
        [r.location, r.propertyType].filter(Boolean).join(' · ') || null,
      href: `/testimonials/${r.id}`,
      imageUrl: null,
      badge: `${r.rating}★`,
    }));

    return {
      group: { entity: 'testimonial', total, items },
      topCandidate: items[0] ?? null,
      topScore: scored[0]?.score ?? 0,
    };
  }

  private async searchBankRates(q: string, limit: number): Promise<EntitySearchResult> {
    const where: Prisma.BankRateWhereInput = {
      OR: [
        { bankName: { contains: q, mode: 'insensitive' } },
        { notes: { contains: q, mode: 'insensitive' } },
      ],
    };
    const [rows, total] = await Promise.all([
      this.prisma.bankRate.findMany({
        where,
        take: limit * 4,
        orderBy: [{ active: 'desc' }, { bankName: 'asc' }],
        select: {
          id: true,
          bankName: true,
          rate: true,
          rateType: true,
          active: true,
          notes: true,
        },
      }),
      this.prisma.bankRate.count({ where }),
    ]);
    const scored = rows
      .map((r) => ({ row: r, score: scoreRow(q, [r.bankName, r.notes]) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const items: SearchResultItem[] = scored.map(({ row: r }) => ({
      id: r.id,
      entity: 'bankRate' as const,
      title: r.bankName,
      subtitle: `${r.rate.toFixed(2)}% · ${r.rateType}`,
      href: `/bank-rates/${r.id}`,
      imageUrl: null,
      badge: r.active ? null : 'inactive',
    }));

    return {
      group: { entity: 'bankRate', total, items },
      topCandidate: items[0] ?? null,
      topScore: scored[0]?.score ?? 0,
    };
  }

  private async searchUsers(q: string, limit: number): Promise<EntitySearchResult> {
    const where: Prisma.AdminUserWhereInput = {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ],
    };
    const [rows, total] = await Promise.all([
      this.prisma.adminUser.findMany({
        where,
        take: limit * 4,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      }),
      this.prisma.adminUser.count({ where }),
    ]);
    const scored = rows
      .map((r) => ({ row: r, score: scoreRow(q, [r.name, r.email]) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const items: SearchResultItem[] = scored.map(({ row: r }) => ({
      id: r.id,
      entity: 'user' as const,
      title: r.name || r.email,
      subtitle: r.email,
      // Admin user list lives under `/people/team`; deep-link with `?focus=`
      // to open the user peek sheet on arrival.
      href: `/people/team?focus=${r.id}`,
      imageUrl: null,
      badge: r.role,
    }));

    return {
      group: { entity: 'user', total, items },
      topCandidate: items[0] ?? null,
      topScore: scored[0]?.score ?? 0,
    };
  }
}
