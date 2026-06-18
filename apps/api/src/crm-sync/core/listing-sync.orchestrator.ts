import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import {
  LISTING_PROVIDER,
  ListingFeed,
  ListingProviderPort,
  ProviderCapabilities,
} from './ports/listing-provider.port';
import { BrandRouteService } from './brand-route.service';
import { ListingWriteService } from './listing-write.service';
import { SyncLockService } from './sync-lock.service';

export interface SyncSummary {
  source: string;
  ran: boolean; // false when skipped (lock held / disabled)
  fetched: number;
  created: number;
  updated: number;
  quarantined: number;
  unpublished: number;
  mediaDownloaded: number;
  mediaReused: number;
  mediaFailed: number;
  errors: number;
  error?: string; // set when the whole run aborted (e.g. feed error)
}

/** Default circuit-breaker: never unpublish more than this share of a source's
 *  live catalog in one run. Overridable via CRM_RECONCILE_MAX_UNPUBLISH_RATIO. */
const DEFAULT_MAX_UNPUBLISH_RATIO = 0.2;
/** The ratio floor only engages above this absolute count — otherwise a tiny
 *  catalog (where one genuine, 404-confirmed removal is already >20%) could
 *  never reconcile. Small drops still pass through per-item 404 verification. */
const RECONCILE_RATIO_MIN_ABSOLUTE = 10;

/**
 * Probe-phase RUNAWAY GUARDS — purely about not hanging forever, NOT a lease
 * budget. They cap how long the per-item liveness loop can run (and how many
 * consecutive probe errors it tolerates) so a wedged/brownout loop aborts and
 * frees the lock for the next tick instead of spinning indefinitely.
 *
 * Lease safety is a SEPARATE, already-satisfied invariant: the heartbeat
 * (3 min) ≪ the lease TTL (10 min) renews the lease while these I/O-bound
 * awaits run, and even a lapsed lease can't double-write because the unpublish
 * is fenced (see `fencedUnpublish`). Total runtime is therefore not lease-bound;
 * these constants exist only to stop an infinite hang.
 */
const PROBE_PHASE_MS = 5 * 60 * 1000;
const MAX_CONSECUTIVE_PROBE_ERRORS = 3;

/**
 * The CRM-agnostic sync algorithm. It knows the canonical model and the
 * provider's CAPABILITIES — never a CRM name. Swapping providers is a DI
 * binding change; nothing here moves.
 *
 * Flow: lock → full walk into memory (abort on any feed error — a partial walk
 * must never trigger deletions) → per-listing pipeline (route → persist, with
 * media mirrored inside persist) → reconcile genuinely-absent listings.
 *
 * Deletion is intentionally hard to trigger. A listing missing from the feed is
 * only a CANDIDATE; it is unpublished only after (1) the walk was complete (not
 * truncated), (2) it wasn't merely mapper-skipped, (3) the run isn't trying to
 * remove an implausible share of the catalog, and (4) — when the provider
 * supports it — a per-item liveness probe confirms a 404. Absence alone never
 * deletes.
 */
@Injectable()
export class ListingSyncOrchestrator {
  private readonly logger = new Logger(ListingSyncOrchestrator.name);
  private readonly maxUnpublishRatio: number;

  constructor(
    @Inject(LISTING_PROVIDER) private readonly provider: ListingProviderPort,
    private readonly brandRoute: BrandRouteService,
    private readonly writer: ListingWriteService,
    private readonly lock: SyncLockService,
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    const raw = Number(
      config.get<string>('CRM_RECONCILE_MAX_UNPUBLISH_RATIO'),
    );
    this.maxUnpublishRatio =
      Number.isFinite(raw) && raw > 0 && raw <= 1
        ? raw
        : DEFAULT_MAX_UNPUBLISH_RATIO;
  }

  async run(): Promise<SyncSummary> {
    const caps = this.provider.capabilities();
    const source = caps.source;
    const result = await this.lock.withLock(source, (token) =>
      this.runLocked(source, token),
    );
    return (
      result ?? {
        source,
        ran: false,
        fetched: 0,
        created: 0,
        updated: 0,
        quarantined: 0,
        unpublished: 0,
        mediaDownloaded: 0,
        mediaReused: 0,
        mediaFailed: 0,
        errors: 0,
      }
    );
  }

  private async runLocked(
    source: string,
    leaseToken: string,
  ): Promise<SyncSummary> {
    const summary: SyncSummary = {
      source,
      ran: true,
      fetched: 0,
      created: 0,
      updated: 0,
      quarantined: 0,
      unpublished: 0,
      mediaDownloaded: 0,
      mediaReused: 0,
      mediaFailed: 0,
      errors: 0,
    };

    const controller = new AbortController();

    // 1. FETCH — full walk into memory. Abort the whole run on any feed error;
    //    we must not reconcile/delete from a partial view of the feed.
    let feed: ListingFeed;
    try {
      feed = await this.provider.fetchAll(controller.signal);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown error';
      this.logger.warn(
        `feed walk failed for "${source}" — aborting run, no deletions: ${message}`,
      );
      controller.abort();
      return { ...summary, error: message };
    }
    summary.fetched = feed.listings.length;

    // 2. PER-LISTING pipeline. One bad listing is logged and skipped; it never
    //    rolls back the others. NOTE: unlike the unpublish path, these writes are
    //    NOT lease-fenced. Safe at a single Fly instance; under horizontal
    //    scaling a premature takeover could double-run this loop — collisions
    //    surface as P2002 on (source, externalId) and are swallowed per-item, so
    //    no corruption, but fence the upsert + image swap if we ever scale out.
    for (const listing of feed.listings) {
      try {
        const routing = await this.brandRoute.decide(listing);
        const outcome = await this.writer.persist(
          listing,
          routing,
          controller.signal,
        );
        if (outcome.action === 'created') summary.created++;
        else summary.updated++;
        if (outcome.quarantined) summary.quarantined++;
        summary.mediaDownloaded += outcome.mediaStats.downloaded;
        summary.mediaReused += outcome.mediaStats.reused;
        summary.mediaFailed += outcome.mediaStats.failed;
      } catch (err) {
        summary.errors++;
        this.logger.warn(
          `failed to persist ${source}:${listing.externalId}: ${
            err instanceof Error ? err.message : 'unknown error'
          }`,
        );
      }
    }

    // 3. RECONCILE — only reached after a fully successful walk.
    const caps = this.provider.capabilities();
    if (caps.deletion.perItem404 || caps.deletion.absence) {
      summary.unpublished = await this.reconcile(
        source,
        feed,
        caps,
        leaseToken,
        controller.signal,
      );
    }

    this.logger.log(
      `sync "${source}" done — fetched=${summary.fetched} created=${summary.created} ` +
        `updated=${summary.updated} quarantined=${summary.quarantined} ` +
        `unpublished=${summary.unpublished} media(dl=${summary.mediaDownloaded}/` +
        `reuse=${summary.mediaReused}/fail=${summary.mediaFailed}) errors=${summary.errors}`,
    );
    return summary;
  }

  /**
   * Soft-unpublish listings that have genuinely left the feed — never
   * hard-deletes (preserves inquiry history), and guarded against every way a
   * healthy catalog could be wiped by a bad feed:
   *
   *   • Truncation: if fewer raw entries were walked than the feed's own
   *     declared total, the view is partial → skip entirely.
   *   • Map-skips: a present-but-unimportable listing (not-for-sale, reserved,
   *     unmapped type, invalid) is SEEN, so it's excluded from candidates.
   *   • Ratio floor: refuse to unpublish more than `maxUnpublishRatio` of the
   *     live catalog in one run (a mass drop is an upstream anomaly, not a sale).
   *   • Per-item 404: when the provider supports it, each candidate's removal is
   *     confirmed by a 404 on its detail endpoint; a 200 or a failed probe keeps
   *     the listing. Absence alone (no 404 capability) is the legacy fallback.
   */
  private async reconcile(
    source: string,
    feed: ListingFeed,
    caps: ProviderCapabilities,
    leaseToken: string,
    signal: AbortSignal,
  ): Promise<number> {
    // Completeness gate — FAIL CLOSED. The walk is trustworthy for deletion
    // ONLY when the provider declared a positive total AND we actually reached
    // it. A missing/zero/NaN total (the load-bearing field of the truncation
    // fix) is treated as untrusted, not as implicit permission to reconcile —
    // otherwise a feed that drops `total_count` silently re-opens the original
    // mass-unpublish hole. REBS (Tastypie envelope) always sends it; if it ever
    // stops, we skip reconcile and log rather than risk the catalog.
    const trustworthy =
      feed.expectedCount != null &&
      feed.expectedCount > 0 &&
      feed.walkedCount >= feed.expectedCount;
    if (!trustworthy) {
      this.logger.warn(
        `feed for "${source}" not trustworthy for reconcile (walked ${feed.walkedCount}, ` +
          `declared ${feed.expectedCount ?? 'none'}) — skipping, no deletions`,
      );
      return 0;
    }

    // Everything we SAW this run — imported or deliberately skipped — is
    // present and therefore not a deletion candidate.
    const seen = new Set<string>(feed.listings.map((l) => l.externalId));
    for (const id of feed.skippedExternalIds) seen.add(id);

    const liveRows = await this.prisma.property.findMany({
      where: { source, unpublishedAt: null },
      select: { externalId: true },
    });
    const liveCount = liveRows.length;
    const candidates = liveRows
      .map((r) => r.externalId)
      .filter((id): id is string => !!id && !seen.has(id));
    if (candidates.length === 0) return 0;

    // Ratio floor (circuit breaker) — only above the absolute minimum so small
    // catalogs aren't permanently un-reconcilable.
    const ratio = candidates.length / liveCount;
    if (
      candidates.length > RECONCILE_RATIO_MIN_ABSOLUTE &&
      ratio > this.maxUnpublishRatio
    ) {
      this.logger.warn(
        `reconcile for "${source}" would unpublish ${candidates.length}/${liveCount} ` +
          `(${(ratio * 100).toFixed(1)}%), over the ${(
            this.maxUnpublishRatio * 100
          ).toFixed(
            0,
          )}% floor — ABORTING unpublish (suspected feed anomaly)`,
      );
      return 0;
    }

    // Confirm each candidate is really gone.
    let confirmed: string[];
    if (caps.deletion.perItem404) {
      // ALL-OR-NOTHING: the probe phase is trusted whole or not at all. We
      // accumulate tentative 404s and commit them ONCE, after a clean full pass.
      // If a runaway guard trips (deadline or too many consecutive errors), we
      // return 0 and DISCARD every tentative confirmation — including ones found
      // before the abort. Committing the already-confirmed ones would let a
      // brownout still delete the listings it managed to probe before failing.
      confirmed = [];
      const probeDeadline = Date.now() + PROBE_PHASE_MS;
      let consecutiveErrors = 0;
      for (const externalId of candidates) {
        if (Date.now() > probeDeadline) {
          this.logger.warn(
            `probe phase for "${source}" exceeded ${PROBE_PHASE_MS}ms — ` +
              `discarding all ${confirmed.length} tentative removals, no deletions`,
          );
          return 0;
        }
        try {
          const alive = await this.provider.isAlive(externalId, signal);
          consecutiveErrors = 0;
          if (!alive) confirmed.push(externalId); // 404 → removed
          // 200 → still live (transiently dropped from the page set) → keep
        } catch (err) {
          // A failed probe is uncertainty, not a deletion signal. An isolated
          // failure just keeps that listing; a RUN of them means the detail
          // endpoint is unhealthy → abort the whole phase rather than trust it.
          if (++consecutiveErrors >= MAX_CONSECUTIVE_PROBE_ERRORS) {
            this.logger.warn(
              `liveness probes for "${source}" failed ${consecutiveErrors}× in a row ` +
                `(endpoint unhealthy) — discarding all tentative removals, no deletions`,
            );
            return 0;
          }
          this.logger.warn(
            `liveness probe failed for ${source}:${externalId} — keeping: ${
              err instanceof Error ? err.message : 'unknown error'
            }`,
          );
        }
      }
    } else {
      // Provider can't probe; absence is the only signal it offers.
      confirmed = candidates;
    }
    if (confirmed.length === 0) return 0;

    return this.fencedUnpublish(source, leaseToken, confirmed);
  }

  /**
   * Soft-unpublish `externalIds` ATOMICALLY GATED on still owning the lease.
   * Guards the double-run window the time-lease can't: if this run stalled past
   * its lease and another instance took over, the `SELECT … FOR UPDATE` finds
   * no row owned by our token (the takeover changed `owner`) and we write
   * nothing — so a thawed, stale run can never corrupt the live run's
   * reconcile. Lock-read and write share one transaction, so the check can't be
   * raced (TOCTOU-free): the row lock serializes against the takeover's update.
   */
  private async fencedUnpublish(
    source: string,
    leaseToken: string,
    externalIds: string[],
  ): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const held = await tx.$queryRaw<unknown[]>`
        SELECT 1 FROM "crm_sync_locks"
        WHERE "source" = ${source}
          AND "owner" = ${leaseToken}
          AND "expires_at" > NOW()
        FOR UPDATE
      `;
      if (!Array.isArray(held) || held.length === 0) {
        this.logger.warn(
          `lease for "${source}" lost before reconcile write — skipping ` +
            `unpublish of ${externalIds.length} (fenced, no deletions)`,
        );
        return 0;
      }
      const { count } = await tx.property.updateMany({
        where: {
          source,
          externalId: { in: externalIds },
          unpublishedAt: null,
        },
        data: { unpublishedAt: new Date() },
      });
      return count;
    });
  }
}
