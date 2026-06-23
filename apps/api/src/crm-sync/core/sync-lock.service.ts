import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Cross-instance run guard via Postgres advisory locks. `@Cron` fires on every
 * Fly instance; this ensures only one runs a given source's sync at a time —
 * which matters most for the reconcile/delete step (two overlapping walks must
 * never race on what's "absent").
 *
 * Correctness note: the pipeline is idempotent by construction (upserts on a
 * unique key, deterministic slugs, URL-keyed media dedupe), so overlapping
 * runs cannot corrupt data — this lock is an optimization + a reconcile guard,
 * not the safety net. Advisory locks are session-scoped and released
 * automatically if the connection dies, so a crashed run cannot wedge the lock
 * permanently. (Under Prisma's pool the unlock is best-effort across
 * connections; the auto-release on disconnect is the backstop.)
 */
@Injectable()
export class SyncLockService {
  private readonly logger = new Logger(SyncLockService.name);

  /** Namespacing class id for all CRM-sync advisory locks ("CRM" in hex). */
  private static readonly CLASS_ID = 0x43524d;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Run `fn` under the source's advisory lock. Returns `fn`'s result, or
   * `null` when the lock is already held elsewhere (run skipped).
   */
  async withLock<T>(source: string, fn: () => Promise<T>): Promise<T | null> {
    const key = SyncLockService.objectId(source);
    if (!(await this.tryAcquire(key))) {
      this.logger.log(
        `sync for "${source}" already running on another instance — skipping`,
      );
      return null;
    }
    try {
      return await fn();
    } finally {
      await this.release(key);
    }
  }

  private async tryAcquire(key: number): Promise<boolean> {
    const rows = await this.prisma.$queryRaw<{ locked: boolean }[]>`
      SELECT pg_try_advisory_lock(${SyncLockService.CLASS_ID}, ${key}) AS locked
    `;
    return rows[0]?.locked === true;
  }

  private async release(key: number): Promise<void> {
    await this.prisma
      .$queryRaw`SELECT pg_advisory_unlock(${SyncLockService.CLASS_ID}, ${key})`.then(
      () => undefined,
      (err: unknown) =>
        this.logger.warn(
          `advisory unlock failed (will auto-release on disconnect): ${
            err instanceof Error ? err.message : 'unknown error'
          }`,
        ),
    );
  }

  /** Stable signed-int32 hash of the source name for the lock's object id. */
  private static objectId(source: string): number {
    let h = 0;
    for (let i = 0; i < source.length; i++) {
      h = (h * 31 + source.charCodeAt(i)) | 0;
    }
    return h;
  }
}
