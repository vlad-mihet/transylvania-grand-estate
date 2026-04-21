import { Logger } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import { SearchService } from './search.service';
import { SiteId, type SiteContext } from '../common/site';
import type { SiteConfigService } from '../site-config/site-config.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { CurrentUserPayload } from '../common/decorators/user.decorator';

type FindManyFn = (...args: unknown[]) => Promise<unknown[]>;

interface MockPrismaCall {
  model: string;
  args: unknown;
}

/**
 * Build a Prisma stub that records every `findMany` call and returns a
 * fixed row set. All ten models the search service touches are stubbed so a
 * missed branch surfaces as a spy assertion failure, not a `TypeError`.
 */
function makePrisma(overrides: Partial<Record<string, FindManyFn>> = {}) {
  const calls: MockPrismaCall[] = [];
  // Always record the call, regardless of whether the caller supplied an
  // override — tests routinely need to both shape the result AND assert the
  // arguments passed to Prisma.
  const wrap = (model: string, fn: FindManyFn): FindManyFn => (args) => {
    calls.push({ model, args });
    return fn(args);
  };
  const empty: FindManyFn = () => Promise.resolve([]);
  const pick = (model: string): FindManyFn =>
    wrap(model, overrides[model] ?? empty);

  const prisma = {
    property: { findMany: pick('property') },
    agent: { findMany: pick('agent') },
    developer: { findMany: pick('developer') },
    city: { findMany: pick('city') },
    county: { findMany: pick('county') },
    article: { findMany: pick('article') },
    inquiry: { findMany: pick('inquiry') },
    testimonial: { findMany: pick('testimonial') },
    bankRate: { findMany: pick('bankRate') },
    adminUser: { findMany: pick('adminUser') },
  } as unknown as PrismaService;

  return { prisma, calls };
}

const siteConfigStub = {
  getTgeCountyScope: async () => [],
} as unknown as SiteConfigService;

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

  describe('role scoping', () => {
    it('AGENT role never fans out to user / bankRate / testimonial / article / county', async () => {
      // Security-critical: a sales agent should never see bank rates or other
      // users' accounts in global search, even if they spoof `types=user` in
      // the URL. The role filter is applied *before* `types` intersects.
      const { prisma, calls } = makePrisma();
      const svc = new SearchService(prisma, siteConfigStub);

      await svc.search(
        { q: 'foo', limit: 5, types: undefined },
        adminSite,
        agentUser,
      );

      const touched = new Set(calls.map((c) => c.model));
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
      const svc = new SearchService(prisma, siteConfigStub);

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
      const svc = new SearchService(prisma, siteConfigStub);

      await svc.search(
        { q: 'foo', limit: 5, types: undefined },
        adminSite,
        adminUser,
      );

      const touched = new Set(calls.map((c) => c.model));
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
      const svc = new SearchService(prisma, siteConfigStub);

      const result = await svc.search({ q: 'x', limit: 5 }, adminSite, null);

      expect(calls).toHaveLength(0);
      expect(result.groups).toEqual([]);
    });
  });

  describe('AGENT ownership clamps', () => {
    it('AGENT property query is pinned to their own agentId', async () => {
      const { prisma, calls } = makePrisma();
      const svc = new SearchService(prisma, siteConfigStub);

      await svc.search({ q: 'foo', limit: 5 }, adminSite, agentUser);

      const propCall = calls.find((c) => c.model === 'property');
      expect(propCall).toBeDefined();
      const where = (propCall!.args as { where: { agentId?: string } }).where;
      expect(where.agentId).toBe('agent-99');
    });

    it('AGENT with no linked agent is clamped to a sentinel (no leak of full catalog)', async () => {
      const { prisma, calls } = makePrisma();
      const svc = new SearchService(prisma, siteConfigStub);

      const unlinked: CurrentUserPayload = {
        ...agentUser,
        agentId: null,
      };
      await svc.search({ q: 'foo', limit: 5 }, adminSite, unlinked);

      const propCall = calls.find((c) => c.model === 'property');
      const where = (propCall!.args as { where: { agentId?: string } }).where;
      // Must be a sentinel that cannot match any real row — regression guard
      // against a refactor that drops the clamp and returns the full catalog
      // for unlinked AGENT accounts.
      expect(where.agentId).toBe('__no-agent__');
    });

    it('AGENT inquiry query is joined through property.agentId', async () => {
      const { prisma, calls } = makePrisma();
      const svc = new SearchService(prisma, siteConfigStub);

      await svc.search({ q: 'foo', limit: 5 }, adminSite, agentUser);

      const inqCall = calls.find((c) => c.model === 'inquiry');
      const where = (inqCall!.args as {
        where: { property?: { agentId?: string } };
      }).where;
      expect(where.property?.agentId).toBe('agent-99');
    });
  });

  describe('hasMore / overflow trick', () => {
    it('requests limit + 1 and reports hasMore=true when the extra row exists', async () => {
      // Six rows requested (limit+1=6); if Prisma returns six, we render
      // five and flag hasMore so the UI shows a "Show all" affordance.
      const sixAgents = Array.from({ length: 6 }, (_, i) => ({
        id: `a-${i}`,
        firstName: 'F',
        lastName: `L${i}`,
        email: `${i}@example.com`,
        photo: null,
        active: true,
      }));
      const { prisma, calls } = makePrisma({
        agent: () => Promise.resolve(sixAgents),
      });
      const svc = new SearchService(prisma, siteConfigStub);

      const result = await svc.search(
        { q: 'F', limit: 5, types: ['agent'] },
        adminSite,
        adminUser,
      );

      const call = calls.find((c) => c.model === 'agent')!;
      expect((call.args as { take: number }).take).toBe(6);
      const group = result.groups.find((g) => g.entity === 'agent');
      expect(group).toBeDefined();
      expect(group!.hasMore).toBe(true);
      expect(group!.items).toHaveLength(5);
    });

    it('hasMore=false when the result set is smaller than limit+1', async () => {
      const threeAgents = Array.from({ length: 3 }, (_, i) => ({
        id: `a-${i}`,
        firstName: 'F',
        lastName: `L${i}`,
        email: `${i}@example.com`,
        photo: null,
        active: true,
      }));
      const { prisma } = makePrisma({
        agent: () => Promise.resolve(threeAgents),
      });
      const svc = new SearchService(prisma, siteConfigStub);

      const result = await svc.search(
        { q: 'F', limit: 5, types: ['agent'] },
        adminSite,
        adminUser,
      );

      const group = result.groups.find((g) => g.entity === 'agent')!;
      expect(group.hasMore).toBe(false);
      expect(group.items).toHaveLength(3);
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
          photo: null,
          active: true,
        },
      ];
      const { prisma } = makePrisma({
        property: () => Promise.reject(new Error('index corrupt')),
        agent: () => Promise.resolve(oneAgent),
      });
      const svc = new SearchService(prisma, siteConfigStub);

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
      const svc = new SearchService(prisma, siteConfigStub);

      const result = await svc.search({ q: 'nope', limit: 5 }, adminSite, adminUser);

      expect(result.groups).toEqual([]);
      expect(result.query).toBe('nope');
    });
  });
});
