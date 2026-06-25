import { Inject, Injectable, Logger } from '@nestjs/common';
import type { CanonicalListingInput } from '@tge/types';
import { PrismaService } from '../../prisma/prisma.service';
import {
  LISTING_PROVIDER,
  ListingProviderPort,
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

/**
 * The CRM-agnostic sync algorithm. It knows the canonical model and the
 * provider's CAPABILITIES — never a CRM name. Swapping providers is a DI
 * binding change; nothing here moves.
 *
 * Flow: lock → full walk into memory (abort on any feed error — a partial walk
 * must never trigger deletions) → per-listing pipeline (route → persist, with
 * media mirrored inside persist) → reconcile absent listings to unpublished.
 */
@Injectable()
export class ListingSyncOrchestrator {
  private readonly logger = new Logger(ListingSyncOrchestrator.name);

  constructor(
    @Inject(LISTING_PROVIDER) private readonly provider: ListingProviderPort,
    private readonly brandRoute: BrandRouteService,
    private readonly writer: ListingWriteService,
    private readonly lock: SyncLockService,
    private readonly prisma: PrismaService,
  ) {}

  async run(): Promise<SyncSummary> {
    const caps = this.provider.capabilities();
    const source = caps.source;
    const result = await this.lock.withLock(source, () => this.runLocked(source));
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

  private async runLocked(source: string): Promise<SyncSummary> {
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
    const listings = new Map<string, CanonicalListingInput>();
    try {
      for await (const listing of this.provider.fetchAll(controller.signal)) {
        listings.set(listing.externalId, listing);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown error';
      this.logger.warn(
        `feed walk failed for "${source}" — aborting run, no deletions: ${message}`,
      );
      controller.abort();
      return { ...summary, error: message };
    }
    summary.fetched = listings.size;

    // 2. PER-LISTING pipeline. One bad listing is logged and skipped; it never
    //    rolls back the others.
    for (const listing of listings.values()) {
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

    // 3. RECONCILE by absence — only reached after a fully successful walk.
    if (this.provider.capabilities().deletion.absence) {
      summary.unpublished = await this.reconcileAbsent(
        source,
        [...listings.keys()],
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
   * Soft-unpublish rows whose externalId is no longer in the feed. Never
   * hard-deletes (preserves inquiry history). Safety guard: a successful walk
   * that returned ZERO listings is treated as an upstream anomaly, not "every
   * listing sold" — we skip reconcile rather than unpublish the whole catalog.
   */
  private async reconcileAbsent(
    source: string,
    presentIds: string[],
  ): Promise<number> {
    if (presentIds.length === 0) {
      this.logger.warn(
        `feed for "${source}" returned 0 listings — skipping reconcile to avoid mass-unpublish`,
      );
      return 0;
    }
    const { count } = await this.prisma.property.updateMany({
      where: {
        source,
        externalId: { notIn: presentIds },
        unpublishedAt: null,
      },
      data: { unpublishedAt: new Date() },
    });
    return count;
  }
}
