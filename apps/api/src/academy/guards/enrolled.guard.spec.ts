import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { EnrolledGuard } from './enrolled.guard';
import type { PrismaService } from '../../prisma/prisma.service';

describe('EnrolledGuard', () => {
  function makeContext(user: { id?: string } | undefined): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  function makePrisma(result: { id: string } | null): PrismaService {
    return {
      academyEnrollment: {
        findFirst: jest.fn().mockResolvedValue(result),
      },
    } as unknown as PrismaService;
  }

  it('rejects anonymous requests with a ForbiddenException', async () => {
    const guard = new EnrolledGuard(makePrisma({ id: 'ignored' }));
    await expect(guard.canActivate(makeContext(undefined))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('passes when the user has an active (non-revoked) enrollment', async () => {
    const guard = new EnrolledGuard(makePrisma({ id: 'enrollment-1' }));
    await expect(
      guard.canActivate(makeContext({ id: 'user-1' })),
    ).resolves.toBe(true);
  });

  it('rejects when the user has no active enrollment (wildcard or specific)', async () => {
    const guard = new EnrolledGuard(makePrisma(null));
    await expect(
      guard.canActivate(makeContext({ id: 'user-1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('queries with revokedAt: null so soft-revoked rows do not grant access', async () => {
    const prisma = makePrisma({ id: 'enrollment-1' });
    const guard = new EnrolledGuard(prisma);
    await guard.canActivate(makeContext({ id: 'user-1' }));
    expect(prisma.academyEnrollment.findFirst).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      select: { id: true },
    });
  });
});
