import type { CanonicalListingInput, CrmSource } from '@tge/types';

/**
 * DI token for the active listing provider. Bound to the REBS adapter today;
 * a second CRM is a second binding, nothing in the core changes.
 */
export const LISTING_PROVIDER = Symbol('LISTING_PROVIDER');

/**
 * What a provider can and cannot do. The orchestrator branches on THIS, never
 * on a CRM name — that is the whole point of the abstraction. Kept minimal:
 * we add a capability only when an adapter that needs it actually exists.
 */
export interface ProviderCapabilities {
  source: CrmSource;
  /** REBS uses a static key (raw `Authorization` header / `?api_key=`). */
  auth: 'apiKey';
  /** Offset/cursor envelope walked to exhaustion (`meta.next`). */
  pagination: 'offset';
  /**
   * Incremental support. `'modifiedTimestamp'` means each listing carries a
   * last-modified ts the core can use to skip unchanged work (e.g. media
   * re-mirroring). `'none'` → always treat as changed. The feed is still a
   * full walk either way; this only gates per-item work.
   */
  delta: 'modifiedTimestamp' | 'none';
  /**
   * How the provider signals a listing is gone. A provider may support both.
   *   perItem404 — a removed listing 404s on direct GET (probe via isAlive).
   *   absence    — removed listings simply drop out of the full walk.
   * When neither is set the core never unpublishes from this source.
   */
  deletion: {
    perItem404: boolean;
    absence: boolean;
  };
  /** Push notifications. Always false today — pull-only. Reserved flag. */
  webhooks: boolean;
}

/**
 * The result of one full feed walk. The adapter owns paging + mapping and
 * returns this snapshot; the core never sees the wire format. Beyond the mapped
 * listings it carries the signals the reconcile step needs to delete SAFELY:
 *   • `skippedExternalIds` — entries the adapter SAW in the feed but chose not
 *     to import (mapper skips: not-for-sale, unmapped type, reserved, invalid).
 *     These are present-in-feed, so they must NEVER be treated as "absent →
 *     deleted". The core excludes them from the unpublish-candidate set.
 *   • `walkedCount` / `expectedCount` — raw entries pulled vs. the provider's
 *     own declared total (e.g. REBS `meta.total_count`). The core refuses to
 *     reconcile when the walk came up short (a truncated feed must not look
 *     like "everything else was deleted"). `expectedCount` is null when the
 *     provider doesn't expose a total.
 */
export interface ListingFeed {
  listings: CanonicalListingInput[];
  skippedExternalIds: string[];
  walkedCount: number;
  expectedCount: number | null;
}

/**
 * The port. Three methods, all CRM-agnostic. `fetchAll` returns a fully-walked,
 * already-mapped snapshot (the adapter owns paging + mapping); the core depends
 * only on the canonical model and these capabilities.
 */
export interface ListingProviderPort {
  capabilities(): ProviderCapabilities;
  /**
   * Walk the ENTIRE active feed and return the mapped snapshot. MUST throw if
   * any page fails or the walk can't be completed — a partial walk must never
   * be mistaken for "these are all the live listings" (that would trigger
   * spurious deletions downstream). On success, `walkedCount` reflects every
   * raw entry seen so the core can detect truncation.
   */
  fetchAll(signal: AbortSignal): Promise<ListingFeed>;
  /**
   * Liveness probe for a single external id. Used only when
   * `capabilities().deletion.perItem404` is set. Returns false on a 404
   * (unpublished), true otherwise.
   */
  isAlive(externalId: string, signal: AbortSignal): Promise<boolean>;
}
