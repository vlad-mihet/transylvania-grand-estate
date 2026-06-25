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
 * The port. Three methods, all CRM-agnostic. `fetchAll` yields already-mapped
 * canonical listings (the adapter owns paging + mapping); the core consumes a
 * uniform stream and knows nothing of the wire format.
 */
export interface ListingProviderPort {
  capabilities(): ProviderCapabilities;
  /**
   * Walk the entire active feed, yielding canonical listings. MUST throw if
   * any page fails — a partial walk must never be mistaken for "these are all
   * the live listings" (that would trigger spurious deletions downstream).
   */
  fetchAll(signal: AbortSignal): AsyncIterable<CanonicalListingInput>;
  /**
   * Liveness probe for a single external id. Used only when
   * `capabilities().deletion.perItem404` is set. Returns false on a 404
   * (unpublished), true otherwise.
   */
  isAlive(externalId: string, signal: AbortSignal): Promise<boolean>;
}
