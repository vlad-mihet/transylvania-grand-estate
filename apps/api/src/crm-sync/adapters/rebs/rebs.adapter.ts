import { Injectable, Logger } from '@nestjs/common';
import type { CanonicalListingInput } from '@tge/types';
import {
  ListingProviderPort,
  ProviderCapabilities,
} from '../../core/ports/listing-provider.port';
import { RebsClient } from './rebs.client';
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

  async *fetchAll(
    signal: AbortSignal,
  ): AsyncIterable<CanonicalListingInput> {
    let skipped = 0;
    for await (const raw of this.client.walkProperties(signal)) {
      const result = mapRebsProperty(raw);
      if (!result.ok) {
        skipped++;
        this.logger.debug(`skipping REBS listing — ${result.reason}`);
        continue;
      }
      yield result.listing;
    }
    if (skipped > 0) {
      this.logger.log(`skipped ${skipped} REBS listings (not for-sale / unmappable)`);
    }
  }

  isAlive(externalId: string, signal: AbortSignal): Promise<boolean> {
    return this.client.isAlive(externalId, signal);
  }
}
