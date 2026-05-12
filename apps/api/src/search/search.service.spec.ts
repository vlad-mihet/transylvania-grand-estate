import { Logger } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { SearchService } from './search.service';
import { SiteId, type SiteContext } from '../common/site';
import type { PrismaService } from '../prisma/prisma.service';
import type { CurrentUserPayload } from '../common/decorators/user.decorator';

type FindManyFn = (...args: unknown[]) => Promise<unknown[]>;
type CountFn = (...args: unknown[]) => Promise<number>;

interface MockPrismaCall {
  model: string;
  op: 'findMany' | 'count';
  args: unknown;
}

/**
 * Build a Prisma stub that records every `findMany` / `count` call and
 * returns a fixed row set. All ten models the search service touches are
 * stubbed so a missed branch surfaces as a spy assertion failure, not a
 * `TypeError`.
 */
function makePrisma(
  overrides: Partial<
    Record<string, { findMany?: FindManyFn; count?: CountFn }>
  > = {},
) {
  const calls: MockPrismaCall[] = [];
  const wrapFind =
    (model: string, fn: FindManyFn): FindManyFn =>
    (args) => {
      calls.push({ model, op: 'findMany', args });
      return fn(args);
    };
  const wrapCount =
    (model: string, fn: CountFn): CountFn =>
    (args) => {
      calls.push({ model, op: 'count', args });
      return fn(args);
    };
  const emptyFind: FindManyFn = () => Promise.resolve([]);
  const zeroCount: CountFn = () => Promise.resolve(0);

  const pick = (model: string) => ({
    findMany: wrapFind(model, overrides[model]?.findMany ?? emptyFind),
    count: wrapCount(model, overrides[model]?.count ?? zeroCount),
  });

  const prisma = {
    property: pick('property'),
    agent: pick('agent'),
    developer: pick('developer'),
    city: pick('city'),
    county: pick('county'),
    article: pick('article'),
    inquiry: pick('inquiry'),
    testimonial: pick('testimonial'),
    bankRate: pick('bankRate'),
    adminUser: pick('adminUser'),
  } as unknown as PrismaService;

  return { prisma, calls };
}

const adminSite: SiteContext = { id: SiteId.ADMIN, origin: null };

const adminUser: CurrentUserPayload = {
  id: 'admin-1',
  email: 'admin@example.com',
  role: AdminRole.ADMIN,
};

const agentUser: CurrentUserPayload = {
  id: 'user-42',
  email: 'agent@example.com',
  role: AdminRole.AGENT,
  agentId: 'agent-99',
};

describe('SearchService', () => {
  // Silence Nest's Logger across the suite — partial-failure tests
  // deliberately trigger an error path that would otherwise pollute CI
  // output with "[Nest] ERROR [SearchService] …" lines.
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });
  afterAll(() => {
    jest.restoreAllMocks();
  });

  const findManyCalls = (calls: MockPrismaCall[]) =>
    calls.filter((c) => c.op === 'findMany');

  describe('role scoping', () => {
    it('AGENT role never fans out to user / bankRate / testimonial / article / county', async () => {
      // Security-critical: a sales agent should never see bank rates or other
      // users' accounts in global search, even if they spoof `types=user` in
      // the URL. The role filter is applied *before* `types` intersects.
      const { prisma, calls } = makePrisma();
      const svc = new SearchService(prisma);

      await svc.search(
        { q: 'foo', limit: 5, types: undefined },
        adminSite,
        agentUser,
      );

      const touched = new Set(findManyCalls(calls).map((c) => c.model));
      expect(touched.has('adminUser')).toBe(false);
      expect(touched.has('bankRate')).toBe(false);
      expect(touched.has('testimonial')).toBe(false);
      expect(touched.has('article')).toBe(false);
      expect(touched.has('county')).toBe(false);
      // The allowed set is property/city/developer/inquiry.
      expect(touched).toEqual(new Set(['property', 'city', 'developer', 'inquiry']));
    });

    it('AGENT cannot widen their scope by passing ?types=user', async () => {
      // The `types` filter intersects with the role allowlist — crafting
      // `types=[user,bankRate]` should yield an empty search, not a backdoor.
      const { prisma, calls } = makePrisma();
      const svc = new SearchService(prisma);

      const result = await svc.search(
        { q: 'foo', limit: 5, types: ['user', 'bankRate'] },
        adminSite,
        agentUser,
      );

      expect(calls).toHaveLength(0);
      expect(result.groups).toEqual([]);
    });

    it('ADMIN queries every entity when no types filter is passed', async () => {
      const { prisma, calls } = makePrisma();
      const svc = new SearchService(prisma);

      await svc.search(
        { q: 'foo', limit: 5, types: undefined },
        adminSite,
        adminUser,
      );

      const touched = new Set(findManyCalls(calls).map((c) => c.model));
      expect(touched).toEqual(
        new Set([
          'property',
          'agent',
          'developer',
          'city',
          'county',
          'article',
          'inquiry',
          'testimonial',
          'bankRate',
          'adminUser',
        ]),
      );
    });

    it('returns empty when there is no authenticated user', async () => {
      // Defensive: the controller's @Roles guard rejects anonymous requests
      // already, but the service mustn't rely on that — unauthenticated ==
      // empty, never "fall through to ADMIN".
      const { prisma, calls } = makePrisma();
      const svc = new SearchService(prisma);

      const result = await svc.search({ q: 'x', limit: 5 }, adminSite, null);

      expect(calls).toHaveLength(0);
      expect(result.groups).toEqual([]);
    });
  });

  describe('AGENT ownership clamps', () => {
    it('AGENT property query is pinned to their own agentId', async () => {
      const { prisma, calls } = makePrisma();
      const svc = new SearchService(prisma);

      await svc.search({ q: 'foo', limit: 5 }, adminSite, agentUser);

      const propCall = findManyCalls(calls).find((c) => c.model === 'property');
      expect(propCall).toBeDefined();
      const where = (propCall!.args as { where: { agentId?: string } }).where;
      expect(where.agentId).toBe('agent-99');
    });

    it('AGENT with no linked agent is clamped to a sentinel (no leak of full catalog)', async () => {
      const { prisma, calls } = makePrisma();
      const svc = new SearchService(prisma);

      const unlinked: CurrentUserPayload = {
        ...agentUser,
        agentId: null,
      };
      await svc.search({ q: 'foo', limit: 5 }, adminSite, unlinked);

      const propCall = findManyCalls(calls).find((c) => c.model === 'property');
      const where = (propCall!.args as { where: { agentId?: string } }).where;
      // Must be a sentinel that cannot match any real row — regression guard
      // against a refactor that drops the clamp and returns the full catalog
      // for unlinked AGENT accounts.
      expect(where.agentId).toBe('__no-agent__');
    });

    it('AGENT inquiry query is joined through property.agentId', async () => {
      const { prisma, calls } = makePrisma();
      const svc = new SearchService(prisma);

      await svc.search({ q: 'foo', limit: 5 }, adminSite, agentUser);

      const inqCall = findManyCalls(calls).find((c) => c.model === 'inquiry');
      const where = (inqCall!.args as {
        where: { property?: { agentId?: string } };
      }).where;
      expect(where.property?.agentId).toBe('agent-99');
    });
  });

  describe('result-count surfacing', () => {
    it('returns `total` from the parallel count() and slices items to `limit`', async () => {
      // Eight rows pre-scored; the service should cap visible items at `limit`
      // (here 5) but report the full total from the dedicated count() call.
      const eightAgents = Array.from({ length: 8 }, (_, i) => ({
        id: `a-${i}`,
        firstName: 'F',
        lastName: `L${i}`,
        email: `${i}@example.com`,
        slug: `l${i}`,
        photo: null,
        active: true,
      }));
      const { prisma, calls } = makePrisma({
        agent: {
          findMany: () => Promise.resolve(eightAgents),
          count: () => Promise.resolve(42),
        },
      });
      const svc = new SearchService(prisma);

      const result = await svc.search(
        { q: 'F', limit: 5, types: ['agent'] },
        adminSite,
        adminUser,
      );

      const agentFind = findManyCalls(calls).find((c) => c.model === 'agent')!;
      // We fetch a wider window (limit * 4) so the in-process scorer has
      // material to re-rank before slicing.
      expect((agentFind.args as { take: number }).take).toBe(20);
      const group = result.groups.find((g) => g.entity === 'agent');
      expect(group).toBeDefined();
      expect(group!.total).toBe(42);
      expect(group!.items).toHaveLength(5);
    });
  });

  describe('href correctness', () => {
    it('agent results link to /people/agents/<id>, not legacy /agents/<id>', async () => {
      // The legacy /agents/<id> admin routes were removed; if this regresses
      // every agent search click 404s. Document with a literal-string assert.
      const { prisma } = makePrisma({
        agent: {
          findMany: () =>
            Promise.resolve([
              {
                id: 'agent-1',
                firstName: 'Andrei',
                lastName: 'Popescu',
                email: 'andrei@example.com',
                slug: 'andrei-popescu',
                photo: null,
                active: true,
              },
            ]),
          count: () => Promise.resolve(1),
        },
      });
      const svc = new SearchService(prisma);
      const result = await svc.search(
        { q: 'andrei', limit: 5, types: ['agent'] },
        adminSite,
        adminUser,
      );
      const group = result.groups.find((g) => g.entity === 'agent')!;
      expect(group.items[0].href).toBe('/people/agents/agent-1');
    });

    it('article results link to /articles/<slug>, not the list page', async () => {
      const { prisma } = makePrisma({
        article: {
          findMany: () =>
            Promise.resolve([
              {
                id: 'art-1',
                slug: 'guide-to-snagov',
                title: { ro: 'Ghid Snagov', en: 'Guide to Snagov' },
                category: 'guide',
                status: 'published',
                coverImage: '/cover.jpg',
              },
            ]),
          count: () => Promise.resolve(1),
        },
      });
      const svc = new SearchService(prisma);
      const result = await svc.search(
        { q: 'snagov', limit: 5, types: ['article'] },
        adminSite,
        adminUser,
      );
      const group = result.groups.find((g) => g.entity === 'article')!;
      expect(group.items[0].href).toBe('/articles/guide-to-snagov');
    });

    it('inquiry / county / user results deep-link with ?focus=<id>', async () => {
      const { prisma } = makePrisma({
        inquiry: {
          findMany: () =>
            Promise.resolve([
              {
                id: 'inq-1',
                name: 'John',
                email: 'j@example.com',
                status: 'new',
                type: 'property',
                entityName: 'Vila X',
              },
            ]),
          count: () => Promise.resolve(1),
        },
        county: {
          findMany: () =>
            Promise.resolve([
              { id: 'co-1', name: 'Cluj', slug: 'cluj', code: 'CJ', propertyCount: 0 },
            ]),
          count: () => Promise.resolve(1),
        },
        adminUser: {
          findMany: () =>
            Promise.resolve([
              { id: 'u-1', name: 'Vlad', email: 'v@example.com', role: AdminRole.ADMIN },
            ]),
          count: () => Promise.resolve(1),
        },
      });
      const svc = new SearchService(prisma);
      const result = await svc.search(
        { q: 'c', limit: 5, types: ['inquiry', 'county', 'user'] },
        adminSite,
        adminUser,
      );
      const inq = result.groups.find((g) => g.entity === 'inquiry')!;
      const co = result.groups.find((g) => g.entity === 'county')!;
      const usr = result.groups.find((g) => g.entity === 'user')!;
      expect(inq.items[0].href).toBe('/inquiries?focus=inq-1');
      expect(co.items[0].href).toBe('/counties?focus=co-1');
      expect(usr.items[0].href).toBe('/people/team?focus=u-1');
    });
  });

  describe('partial failures (Promise.allSettled)', () => {
    it('a failing entity query does not poison the whole response', async () => {
      // If the Property query throws (e.g. corrupted composite index), we
      // still want Agents + Cities to render. Regression guard against a
      // refactor that swaps allSettled back to Promise.all.
      const oneAgent = [
        {
          id: 'a-1',
          firstName: 'Anne',
          lastName: 'Agent',
          email: 'anne@example.com',
          slug: 'anne',
          photo: null,
          active: true,
        },
      ];
      const { prisma } = makePrisma({
        property: { findMany: () => Promise.reject(new Error('index corrupt')) },
        agent: {
          findMany: () => Promise.resolve(oneAgent),
          count: () => Promise.resolve(1),
        },
      });
      const svc = new SearchService(prisma);

      const result = await svc.search({ q: 'a', limit: 5 }, adminSite, adminUser);

      const entities = result.groups.map((g) => g.entity);
      expect(entities).not.toContain('property');
      expect(entities).toContain('agent');
    });
  });

  describe('empty-group suppression', () => {
    it('does not return groups with zero items', async () => {
      // All stubs return [] — the response should be an empty `groups`
      // array, not ten empty groups. This keeps the wire payload small and
      // the UI's "No results" branch simple to author.
      const { prisma } = makePrisma();
      const svc = new SearchService(prisma);

      const result = await svc.search({ q: 'nope', limit: 5 }, adminSite, adminUser);

      expect(result.groups).toEqual([]);
      expect(result.query).toBe('nope');
    });
  });

  describe('getCounts (rail inventory badges)', () => {
    /**
     * The counts endpoint runs one indexed `count()` per allowed entity in
     * parallel. These tests pin the wire shape and the role/agent clamps.
     */

    it('ADMIN gets a count entry for every entity type they can search', async () => {
      const { prisma } = makePrisma({
        property: { count: () => Promise.resolve(123) },
        agent: { count: () => Promise.resolve(45) },
        developer: { count: () => Promise.resolve(7) },
        city: { count: () => Promise.resolve(60) },
        county: { count: () => Promise.resolve(41) },
        article: { count: () => Promise.resolve(12) },
        inquiry: { count: () => Promise.resolve(300) },
        testimonial: { count: () => Promise.resolve(18) },
        bankRate: { count: () => Promise.resolve(9) },
        adminUser: { count: () => Promise.resolve(5) },
      });
      const svc = new SearchService(prisma);

      const result = await svc.getCounts(adminSite, adminUser);

      const entities = result.counts.map((c) => c.entity).sort();
      expect(entities).toEqual(
        ['agent', 'article', 'bankRate', 'city', 'county', 'developer', 'inquiry', 'property', 'testimonial', 'user'].sort(),
      );
      const byEntity = Object.fromEntries(result.counts.map((c) => [c.entity, c.count]));
      expect(byEntity.property).toBe(123);
      expect(byEntity.user).toBe(5);
    });

    it('AGENT only gets counts for property / city / developer / inquiry', async () => {
      const { prisma, calls } = makePrisma({
        property: { count: () => Promise.resolve(8) },
        city: { count: () => Promise.resolve(60) },
        developer: { count: () => Promise.resolve(7) },
        inquiry: { count: () => Promise.resolve(15) },
      });
      const svc = new SearchService(prisma);

      const result = await svc.getCounts(adminSite, agentUser);

      const entities = result.counts.map((c) => c.entity).sort();
      expect(entities).toEqual(['city', 'developer', 'inquiry', 'property']);

      // Defensive: confirm we never even called count() on the disallowed
      // models — the role gate runs *before* the fan-out.
      const touched = new Set(
        calls.filter((c) => c.op === 'count').map((c) => c.model),
      );
      expect(touched.has('adminUser')).toBe(false);
      expect(touched.has('bankRate')).toBe(false);
      expect(touched.has('testimonial')).toBe(false);
      expect(touched.has('article')).toBe(false);
    });

    it('AGENT property + inquiry counts are clamped to their own agentId', async () => {
      const { prisma, calls } = makePrisma({
        property: { count: () => Promise.resolve(8) },
        city: { count: () => Promise.resolve(60) },
        developer: { count: () => Promise.resolve(7) },
        inquiry: { count: () => Promise.resolve(3) },
      });
      const svc = new SearchService(prisma);

      await svc.getCounts(adminSite, agentUser);

      const propertyCount = calls.find(
        (c) => c.op === 'count' && c.model === 'property',
      );
      const inquiryCount = calls.find(
        (c) => c.op === 'count' && c.model === 'inquiry',
      );
      const propWhere = (propertyCount!.args as { where: { agentId?: string } })
        .where;
      const inqWhere = (inquiryCount!.args as {
        where: { property?: { agentId?: string } };
      }).where;
      expect(propWhere.agentId).toBe('agent-99');
      expect(inqWhere.property?.agentId).toBe('agent-99');
    });

    it('returns an empty counts array for an unauthenticated caller', async () => {
      const { prisma, calls } = makePrisma();
      const svc = new SearchService(prisma);

      const result = await svc.getCounts(adminSite, null);

      expect(result.counts).toEqual([]);
      expect(calls).toHaveLength(0);
    });
  });

  describe('topResult promotion (Slack-style lead row)', () => {
    /**
     * Helper builds a Prisma stub where two entities both yield rows that
     * the scorer will rate as exact matches (score 5) for query "snagov".
     * `searchProperties` is invoked first in the orchestrator, so when
     * scores tie the property's candidate wins.
     */
    const snagovStubs = () =>
      makePrisma({
        property: {
          findMany: () =>
            Promise.resolve([
              {
                id: 'p-1',
                slug: 'snagov', // exact match → score 5
                title: { ro: 'Vila Snagov', en: 'Snagov Villa' },
                city: 'Snagov',
                neighborhood: 'Lac',
                tier: 'luxury',
                images: [{ src: '/p.jpg' }],
              },
            ]),
          count: () => Promise.resolve(1),
        },
        city: {
          findMany: () =>
            Promise.resolve([
              {
                id: 'c-1',
                name: 'Snagov', // exact match → score 5
                slug: 'snagov',
                image: '/c.jpg',
                propertyCount: 3,
                county: { name: 'Ilfov' },
              },
            ]),
          count: () => Promise.resolve(1),
        },
      });

    it('promotes a top result when ≥ 2 entity groups have hits and the score is ≥ 3', async () => {
      const { prisma } = snagovStubs();
      const svc = new SearchService(prisma);

      const result = await svc.search(
        { q: 'snagov', limit: 5 }, // no types filter → scope = "all"
        adminSite,
        adminUser,
      );

      expect(result.topResult).not.toBeNull();
      // Property runs before city in the task order; on a tie the first
      // candidate with the max score wins the reduce.
      expect(result.topResult!.entity).toBe('property');
      expect(result.topResult!.id).toBe('p-1');
    });

    it('does NOT promote a top result when the caller narrowed scope', async () => {
      // Even though the data would score high, an explicit ?types= request
      // means the user already picked a lane — surfacing a "best across all"
      // would be misleading.
      const { prisma } = snagovStubs();
      const svc = new SearchService(prisma);

      const result = await svc.search(
        { q: 'snagov', limit: 5, types: ['property'] },
        adminSite,
        adminUser,
      );

      expect(result.topResult ?? null).toBeNull();
    });

    it('does NOT promote a top result when only one entity has hits', async () => {
      // Single-group response — surfacing a top row would just duplicate
      // the first item of the only group. Eligibility requires ≥ 2 groups.
      const { prisma } = makePrisma({
        city: {
          findMany: () =>
            Promise.resolve([
              {
                id: 'c-1',
                name: 'Cluj',
                slug: 'cluj',
                image: null,
                propertyCount: 0,
                county: null,
              },
            ]),
          count: () => Promise.resolve(1),
        },
      });
      const svc = new SearchService(prisma);

      const result = await svc.search({ q: 'cluj', limit: 5 }, adminSite, adminUser);

      expect(result.groups).toHaveLength(1);
      expect(result.topResult ?? null).toBeNull();
    });

    it('does NOT promote a top result when the winning score is below the threshold', async () => {
      // Both entities produce only substring matches (score 2) — too weak to
      // confidently promote. Threshold is word-boundary or better (≥ 3).
      //
      // Crafting score-2-only rows means avoiding three signals:
      //   - exact equality with the query
      //   - any haystack STARTING with the query (prefix → score 4)
      //   - " <q>" or "-<q>" anywhere (word-boundary → score 3)
      // The data below picks "zzz" as the query and puts it strictly inside
      // larger tokens with no preceding space or dash.
      const { prisma } = makePrisma({
        property: {
          findMany: () =>
            Promise.resolve([
              {
                id: 'p-1',
                slug: 'casamzzzy', // substring only
                title: { ro: 'Casamzzzy oarecare' }, // no space before "zzz"
                city: 'Bucuresti',
                neighborhood: null,
                tier: 'affordable',
                images: [],
              },
            ]),
          count: () => Promise.resolve(1),
        },
        agent: {
          findMany: () =>
            Promise.resolve([
              {
                id: 'a-1',
                firstName: 'Mihaela',
                lastName: 'Mzzzow', // "zzz" inside; doesn't start with it
                email: 'mihaela.mzzzow@example.com',
                slug: 'mihaela-mzzzow',
                photo: null,
                active: true,
              },
            ]),
          count: () => Promise.resolve(1),
        },
      });
      const svc = new SearchService(prisma);

      const result = await svc.search({ q: 'zzz', limit: 5 }, adminSite, adminUser);

      // Both groups should still render normally.
      expect(result.groups.length).toBeGreaterThanOrEqual(2);
      // …but neither qualifies for the lead row.
      expect(result.topResult ?? null).toBeNull();
    });
  });
});
