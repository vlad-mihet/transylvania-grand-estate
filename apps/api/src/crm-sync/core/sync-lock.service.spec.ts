import { Prisma } from '@prisma/client';
import { SyncLockService } from './sync-lock.service';

/**
 * The lock's whole reason for existing is that the previous advisory-lock
 * implementation could LEAK (unlock missing on a different pooled connection),
 * silently wedging every future sync. These tests drive a fake that can deny
 * acquire and fail release — the exact conditions the old `FakePrisma` (which
 * always granted) hid — and prove the leased lock can't wedge.
 */
class LockFakePrisma {
  locks = new Map<string, { source: string; owner: string; expiresAt: Date }>();
  failRelease = false;

  crmSyncLock = {
    create: async ({ data }: any) => {
      if (this.locks.has(data.source)) {
        throw new Prisma.PrismaClientKnownRequestError('dup', {
          code: 'P2002',
          clientVersion: 'test',
        });
      }
      this.locks.set(data.source, { ...data });
      return { ...data };
    },
    updateMany: async ({ where, data }: any) => {
      let count = 0;
      for (const [source, row] of this.locks) {
        if (where.source !== undefined && source !== where.source) continue;
        if (where.owner !== undefined && row.owner !== where.owner) continue;
        if (where.expiresAt?.lt && !(row.expiresAt < where.expiresAt.lt)) continue;
        Object.assign(row, data);
        count++;
      }
      return { count };
    },
    deleteMany: async ({ where }: any) => {
      if (this.failRelease) throw new Error('release boom');
      let count = 0;
      for (const [source, row] of [...this.locks]) {
        if (where.source !== undefined && source !== where.source) continue;
        if (where.owner !== undefined && row.owner !== where.owner) continue;
        this.locks.delete(source);
        count++;
      }
      return { count };
    },
  };
}

describe('SyncLockService (leased row-lock)', () => {
  it('runs the body under the lease and releases it afterwards', async () => {
    const prisma = new LockFakePrisma();
    const svc = new SyncLockService(prisma as any);

    const result = await svc.withLock('rebs', async () => 'ok');

    expect(result).toBe('ok');
    expect(prisma.locks.size).toBe(0); // released
  });

  it('skips (returns null) when a live lease is held by another runner', async () => {
    const prisma = new LockFakePrisma();
    prisma.locks.set('rebs', {
      source: 'rebs',
      owner: 'other-instance',
      expiresAt: new Date(Date.now() + 60_000), // still valid
    });
    const svc = new SyncLockService(prisma as any);

    const fn = jest.fn(async () => 'ran');
    const result = await svc.withLock('rebs', fn);

    expect(result).toBeNull();
    expect(fn).not.toHaveBeenCalled();
  });

  it('takes over a crashed run’s EXPIRED lease (never wedges permanently)', async () => {
    const prisma = new LockFakePrisma();
    prisma.locks.set('rebs', {
      source: 'rebs',
      owner: 'crashed-instance',
      expiresAt: new Date(Date.now() - 1_000), // expired
    });
    const svc = new SyncLockService(prisma as any);

    const result = await svc.withLock('rebs', async () => 'recovered');

    expect(result).toBe('recovered');
    expect(prisma.locks.size).toBe(0); // taken over, then released
  });

  it('swallows a release failure (the body result still returns; lease will expire)', async () => {
    const prisma = new LockFakePrisma();
    prisma.failRelease = true;
    const svc = new SyncLockService(prisma as any);

    await expect(svc.withLock('rebs', async () => 'done')).resolves.toBe('done');
    // The row is still present (release threw), but it carries an expiry, so a
    // future run can take it over — i.e. it cannot wedge forever.
    expect(prisma.locks.size).toBe(1);
    const row = prisma.locks.get('rebs')!;
    expect(row.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});
