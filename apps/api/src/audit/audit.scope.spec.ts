import { AdminRole } from '@prisma/client';
import { buildScopeWhere } from './audit.scope';
import type { CurrentUserPayload } from '../common/decorators/user.decorator';
import type { PrismaService } from '../prisma/prisma.service';

/**
 * Role-scope contract tests. The shapes returned by buildScopeWhere are
 * AND-ed into every audit query — getting them wrong silently widens or
 * narrows visibility for an entire role, which is the kind of bug that
 * never surfaces in functional smoke tests. These assertions pin the
 * matrix so any future edit to the scope logic is intentional.
 */
describe('buildScopeWhere', () => {
  const prismaStub = {} as PrismaService; // unused on non-AGENT branches

  function user(
    role: AdminRole,
    overrides: Partial<CurrentUserPayload> = {},
  ): CurrentUserPayload {
    return {
      id: 'user-id',
      email: 'u@example.com',
      role,
      agentId: null,
      ...overrides,
    };
  }

  it('SUPER_ADMIN: empty filter (firehose)', async () => {
    expect(
      await buildScopeWhere(user(AdminRole.SUPER_ADMIN), prismaStub),
    ).toEqual({});
  });

  it('ADMIN: excludes user-security and auth.* events', async () => {
    const where = await buildScopeWhere(user(AdminRole.ADMIN), prismaStub);
    expect(where).toEqual({
      NOT: {
        OR: [
          {
            resource: 'AdminUser',
            action: {
              in: [
                'user.role-changed',
                'user.password-changed',
                'user.password-reset',
              ],
            },
          },
          { action: { startsWith: 'auth.' } },
        ],
      },
    });
  });

  it('EDITOR: limited to content resources', async () => {
    const where = await buildScopeWhere(user(AdminRole.EDITOR), prismaStub);
    expect(where).toEqual({
      resource: { in: ['Article', 'Property', 'Testimonial'] },
    });
  });

  it('AGENT without linked agentId: own actorId only', async () => {
    const where = await buildScopeWhere(user(AdminRole.AGENT), prismaStub);
    expect(where).toEqual({ OR: [{ actorId: 'user-id' }] });
  });

  it('AGENT with agentId and owned properties: own actor OR own properties', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
    const prisma = {
      property: { findMany },
    } as unknown as PrismaService;

    const where = await buildScopeWhere(
      user(AdminRole.AGENT, { agentId: 'agent-1' }),
      prisma,
    );
    expect(findMany).toHaveBeenCalledWith({
      where: { agentId: 'agent-1' },
      select: { id: true },
    });
    expect(where).toEqual({
      OR: [
        { actorId: 'user-id' },
        {
          resource: 'Property',
          resourceId: { in: ['p1', 'p2'] },
        },
      ],
    });
  });

  it('AGENT with agentId but zero owned properties: degrades to own actor only', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      property: { findMany },
    } as unknown as PrismaService;

    const where = await buildScopeWhere(
      user(AdminRole.AGENT, { agentId: 'agent-1' }),
      prisma,
    );
    expect(where).toEqual({ OR: [{ actorId: 'user-id' }] });
  });

  it('Unknown role: fail-closed sentinel (matches no rows)', async () => {
    const where = await buildScopeWhere(
      user('NEW_ROLE' as AdminRole),
      prismaStub,
    );
    expect(where).toEqual({ id: '__never__' });
  });
});
