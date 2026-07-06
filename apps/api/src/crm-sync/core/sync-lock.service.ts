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
 * not the safety net.
 *
 * The lock is TRANSACTION-scoped (`pg_try_advisory_xact_lock`) inside one
 * interactive transaction that owns the lock's entire lifetime. The previous
 * session-scoped version acquired and unlocked via separate `$queryRaw` calls,
 * which Prisma routes onto ARBITRARY pool connections: the unlock silently
 * no-oped on a different session, the acquiring connection idled in the pool
 * still holding the lock, and every subsequent run was skipped (observed
 * 2026-07-06 on the first live feed run). A xact lock cannot leak — it
 * releases on commit, rollback, timeout, or connection death.
 */
@Injectable()
export class SyncLockService {
  private readonly logger = new Logger(SyncLockService.name);

  /** Namespacing class id for all CRM-sync advisory locks ("CRM" in hex). */
  private static readonly CLASS_ID = 0x43524d;

  /**
   * Upper bound on one sync run. The lock's transaction idles while the run
   * executes; if a run wedges past this, Prisma aborts the transaction and
   * the lock frees for the next cron tick (idempotency makes a torn run safe).
   */
  private static readonly RUN_TIMEOUT_MS = 30 * 60_000;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Run `fn` under the source's advisory lock. Returns `fn`'s result, or
   * `null` when the lock is already held elsewhere (run skipped).
   */
  async withLock<T>(source: string, fn: () => Promise<T>): Promise<T | null> {
    const key = SyncLockService.objectId(source);
    let acquired = false;
    let result: T | null = null;

    await this.prisma.$transaction(
      async (tx) => {
        // Cast both args to int4: Postgres only has (int,int) and (bigint)
        // overloads — Prisma binds JS numbers as bigint, so without the casts
        // the two-arg call resolves to a non-existent (bigint,bigint)
        // overload (P2010 / 42883). The keys are int32 by construction.
        const rows = await tx.$queryRaw<{ locked: boolean }[]>`
          SELECT pg_try_advisory_xact_lock(${SyncLockService.CLASS_ID}::int, ${key}::int) AS locked
        `;
        if (rows[0]?.locked !== true) return;
        acquired = true;
        // fn's own DB writes use the normal pooled client and commit
        // independently — this transaction exists only to pin the lock to
        // one session for exactly the duration of the run.
        result = await fn();
      },
      { maxWait: 10_000, timeout: SyncLockService.RUN_TIMEOUT_MS },
    );

    if (!acquired) {
      this.logger.log(
        `sync for "${source}" already running on another instance — skipping`,
      );
      return null;
    }
    return result;
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
