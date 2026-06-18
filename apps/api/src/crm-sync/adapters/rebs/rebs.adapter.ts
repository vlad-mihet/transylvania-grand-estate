import { Injectable, Logger } from '@nestjs/common';
import { canonicalListingSchema } from '@tge/types';
import {
  ListingFeed,
  ListingProviderPort,
  ProviderCapabilities,
} from '../../core/ports/listing-provider.port';
import { RebsClient, WalkReport } from './rebs.client';
import { mapRebsProperty } from './rebs.mapper';

/**
 * REBS implementation of the listing provider port. Composes the transport
 * (RebsClient) with the pure mapper, exposing a uniform canonical stream. This
 * is the seam: a second CRM is a sibling adapter + a different DI binding;
 * nothing in `core/` changes.
 */
@Injectable()
export class RebsAdapter implements ListingProviderPort {
  private readonly logger = new Logger(RebsAdapter.name);

  constructor(private readonly client: RebsClient) {}

  capabilities(): ProviderCapabilities {
    return {
      source: 'rebs',
      auth: 'apiKey',
      pagination: 'offset',
      delta: 'modifiedTimestamp',
      // REBS signals removal both ways: a removed listing 404s on direct GET,
      // and the /property/ feed lists ACTIVE listings only (so removed ones
      // also vanish from the walk). The hourly full-walk relies on `absence`.
      deletion: { perItem404: true, absence: true },
      webhooks: false,
    };
  }

  async fetchAll(signal: AbortSignal): Promise<ListingFeed> {
    const listings: ListingFeed['listings'] = [];
    const skippedExternalIds: string[] = [];
    const report: WalkReport = { walkedCount: 0, totalCount: null };

    for await (const raw of this.client.walkProperties(signal, report)) {
      const result = mapRebsProperty(raw);
      if (!result.ok) {
        // Record SEEN-but-skipped ids so the core never mistakes a skip for a
        // deletion. (Skips without an id were never importable anyway.)
        if (result.externalId) skippedExternalIds.push(result.externalId);
        this.logger.debug(`skipping REBS listing — ${result.reason}`);
        continue;
      }
      // Enforce the canonical contract at the boundary (the "load-bearing
      // wall"): a mapper bug that produced an out-of-contract value is caught
      // here, not deep in persistence. A failure is a skip, not a deletion.
      const parsed = canonicalListingSchema.safeParse(result.listing);
      if (!parsed.success) {
        skippedExternalIds.push(result.listing.externalId);
        this.logger.warn(
          `REBS listing ${result.listing.externalId} failed canonical validation: ` +
            parsed.error.issues
              .map((i) => `${i.path.join('.')} ${i.message}`)
              .join('; '),
        );
        continue;
      }
      listings.push(parsed.data);
    }

    if (skippedExternalIds.length > 0) {
      this.logger.log(
        `skipped ${skippedExternalIds.length} REBS listings (not for-sale / unmappable / invalid)`,
      );
    }

    return {
      listings,
      skippedExternalIds,
      walkedCount: report.walkedCount,
      expectedCount: report.totalCount,
    };
  }

  isAlive(externalId: string, signal: AbortSignal): Promise<boolean> {
    return this.client.isAlive(externalId, signal);
  }
}
