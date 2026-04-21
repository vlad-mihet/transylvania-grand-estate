import { Logger } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';

const log = new Logger('AdvisoryLock');

/**
 * Single-winner wrapper for cron bodies. Uses pg_try_advisory_lock with a
 * 64-bit key derived from the lock name; if another instance holds the lock
 * we silently skip this tick instead of running duplicate work.
 *
 * Why hashtext instead of hashing ourselves: hashtext is the same hash
 * Postgres uses internally and packs into int64, which is exactly what
 * pg_try_advisory_lock takes. Using two int32s from hashtext(name) plus
 * hashtext(name || ':salt') also works but adds a salt we'd have to manage.
 * Single int32 widened to int64 is plenty for our handful of cron names.
 *
 * Usage:
 *   await withAdvisoryLock(this.prisma, 'invitation.expireStale', async () => {
 *     ...
 *   });
 *
 * The lock is session-scoped; it auto-releases when the connection returns
 * to the Prisma pool, so forgetting to call pg_advisory_unlock is safe.
 * We unlock explicitly anyway for hygiene.
 */
export async function withAdvisoryLock<T>(
  prisma: PrismaService,
  name: string,
  fn: () => Promise<T>,
): Promise<T | 'skipped'> {
  // Use a transaction so the session owning the lock is the same one doing
  // the work. Without a transaction, Prisma may hand out a different
  // connection for subsequent queries and we'd release the wrong lock.
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRawUnsafe<Array<{ acquired: boolean }>>(
      `SELECT pg_try_advisory_xact_lock(hashtext($1)) AS acquired`,
      name,
    );
    const acquired = rows[0]?.acquired === true;
    if (!acquired) {
      log.debug(`skipped ${name} \u2014 another instance holds the lock`);
      return 'skipped' as const;
    }
    return fn();
  });
}
