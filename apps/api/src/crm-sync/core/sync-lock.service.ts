import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

/** Lease length. A run that outlives this without a heartbeat can be taken
 *  over by another instance — keep it comfortably above a normal run time. */
const LEASE_MS = 10 * 60 * 1000;
/** How often a live run extends its lease. Must be < LEASE_MS. */
const HEARTBEAT_MS = 3 * 60 * 1000;

/**
 * Cross-instance single-runner guard via a LEASED DB row (`CrmSyncLock`).
 *
 * This replaces a session-scoped `pg_try_advisory_lock`, which is unsafe under
 * Prisma's connection pool: `acquire` and `unlock` can run on different pooled
 * connections, so the unlock misses and the advisory lock leaks — after one run
 * every subsequent tick logs "already running" and the sync silently dies.
 *
 * The lease can't wedge: it carries an `expiresAt` that a live run heartbeats
 * forward, and a crashed run's stale lease is atomically taken over by the next
 * run once it expires. Acquire is race-safe — the insert is serialized by the
 * primary key, and the expired-lease takeover by the row lock on `updateMany`.
 */
@Injectable()
export class SyncLockService {
  private readonly logger = new Logger(SyncLockService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Run `fn` while holding the source's lease. Returns `fn`'s result, or `null`
   * when the lease is already held by a live run elsewhere (run skipped).
   *
   * `fn` receives the lease OWNER token. Because the lease is time-based, a run
   * that stalls past the lease (the heartbeat lives on the same event loop, so
   * it stalls too) can be taken over by another instance. Any DESTRUCTIVE write
   * must therefore re-verify ownership with this token, atomically, before
   * writing — see the fenced unpublish in the orchestrator.
   */
  async withLock<T>(
    source: string,
    fn: (token: string) => Promise<T>,
  ): Promise<T | null> {
    const owner = randomUUID();
    if (!(await this.tryAcquire(source, owner))) {
      this.logger.log(
        `sync for "${source}" already running (lease held) — skipping`,
      );
      return null;
    }

    const heartbeat = setInterval(() => {
      void this.heartbeat(source, owner);
    }, HEARTBEAT_MS);
    // The heartbeat must not by itself keep the process alive.
    if (typeof heartbeat.unref === 'function') heartbeat.unref();

    try {
      return await fn(owner);
    } finally {
      clearInterval(heartbeat);
      await this.release(source, owner);
    }
  }

  /** Claim a free slot, or steal an expired lease. Atomic across instances. */
  private async tryAcquire(source: string, owner: string): Promise<boolean> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + LEASE_MS);

    // Fast path: no row yet → the primary key serializes concurrent inserts,
    // so exactly one instance wins and the rest get P2002.
    try {
      await this.prisma.crmSyncLock.create({
        data: { source, owner, acquiredAt: now, expiresAt },
      });
      return true;
    } catch (err) {
      if (
        !(err instanceof Prisma.PrismaClientKnownRequestError) ||
        err.code !== 'P2002'
      ) {
        throw err;
      }
    }

    // A row already exists. Take it over ONLY if its lease has expired. The
    // `expiresAt < now` predicate is evaluated under the row lock, so two
    // instances racing the takeover can't both win (the loser sees a fresh
    // expiry → count 0).
    const { count } = await this.prisma.crmSyncLock.updateMany({
      where: { source, expiresAt: { lt: now } },
      data: { owner, acquiredAt: now, expiresAt },
    });
    return count === 1;
  }

  /** Extend our lease. No-op (count 0) if we no longer own it. */
  private async heartbeat(source: string, owner: string): Promise<void> {
    const expiresAt = new Date(Date.now() + LEASE_MS);
    await this.prisma.crmSyncLock
      .updateMany({ where: { source, owner }, data: { expiresAt } })
      .catch((err: unknown) =>
        this.logger.warn(
          `lease heartbeat failed for "${source}": ${
            err instanceof Error ? err.message : 'unknown error'
          }`,
        ),
      );
  }

  /** Release our lease. A missed release just lets the lease expire. */
  private async release(source: string, owner: string): Promise<void> {
    await this.prisma.crmSyncLock
      .deleteMany({ where: { source, owner } })
      .then(
        () => undefined,
        (err: unknown) =>
          this.logger.warn(
            `lease release failed for "${source}" (will expire on its own): ${
              err instanceof Error ? err.message : 'unknown error'
            }`,
          ),
      );
  }
}
