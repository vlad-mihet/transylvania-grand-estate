import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RebsFeed, RebsProperty, rebsFeedSchema } from './rebs.types';

const PAGE_LIMIT = 50; // REBS default is 20; larger pages = fewer round-trips.
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_PAGE_ATTEMPTS = 3; // quick in-run retries; the hourly cron is the
const RETRY_BASE_MS = 2_000; // longer-cadence retry (see note in the adapter).

/**
 * REBS HTTP transport: auth, pagination walk, and per-page retry. Knows the
 * REBS wire format (envelope + raw object), nothing about our domain. Returns
 * raw `RebsProperty` objects; mapping to the canonical model is the mapper's
 * job.
 *
 * Auth is a static key passed as a RAW `Authorization` header (NOT `Bearer`),
 * matching the REBS contract.
 */
@Injectable()
export class RebsClient {
  private readonly logger = new Logger(RebsClient.name);

  constructor(private readonly config: ConfigService) {}

  private get baseUrl(): string {
    return (this.config.get<string>('REBS_BASE_URL') ?? '').replace(/\/+$/, '');
  }

  private get apiKey(): string {
    return this.config.get<string>('REBS_API_KEY') ?? '';
  }

  /** Sync is live only with a key AND the explicit enable flag set to '1'. */
  isEnabled(): boolean {
    return (
      this.apiKey.length > 0 &&
      this.config.get<string>('REBS_SYNC_ENABLED') === '1'
    );
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0 && this.baseUrl.length > 0;
  }

  /** Walk the active-property feed page by page, following `meta.next`. */
  async *walkProperties(
    signal: AbortSignal,
  ): AsyncIterable<RebsProperty> {
    let url: string | null = `${this.baseUrl}/property/?limit=${PAGE_LIMIT}`;
    while (url) {
      const feed: RebsFeed = await this.fetchPage(url, signal);
      for (const obj of feed.objects) yield obj;
      url = this.resolveNext(feed.meta?.next ?? null);
    }
  }

  /** Liveness probe: GET /property/{id} — a 404 means unpublished. */
  async isAlive(externalId: string, signal: AbortSignal): Promise<boolean> {
    const res = await this.fetch(
      `${this.baseUrl}/property/${encodeURIComponent(externalId)}/`,
      signal,
    );
    if (res.status === 404) return false;
    return res.ok;
  }

  private async fetchPage(url: string, signal: AbortSignal): Promise<RebsFeed> {
    let lastErr: unknown;
    for (let attempt = 1; attempt <= MAX_PAGE_ATTEMPTS; attempt++) {
      try {
        const res = await this.fetch(url, signal);
        if (!res.ok) {
          throw new Error(`REBS returned ${res.status} for ${url}`);
        }
        const json = await res.json();
        return rebsFeedSchema.parse(json);
      } catch (err) {
        lastErr = err;
        if (attempt < MAX_PAGE_ATTEMPTS && !signal.aborted) {
          const delay = RETRY_BASE_MS * 2 ** (attempt - 1);
          this.logger.warn(
            `REBS page fetch attempt ${attempt} failed (${
              err instanceof Error ? err.message : 'unknown'
            }); retrying in ${delay}ms`,
          );
          await sleep(delay, signal);
          continue;
        }
        break;
      }
    }
    throw lastErr instanceof Error
      ? lastErr
      : new Error('REBS page fetch failed');
  }

  private async fetch(url: string, signal: AbortSignal): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const onParentAbort = () => controller.abort();
    signal.addEventListener('abort', onParentAbort, { once: true });
    try {
      return await fetch(url, {
        headers: {
          // REBS expects the raw key here — NOT `Bearer <key>`.
          Authorization: this.apiKey,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
      signal.removeEventListener('abort', onParentAbort);
    }
  }

  /** `meta.next` may be absolute or a site-relative path; normalize to absolute. */
  private resolveNext(next: string | null): string | null {
    if (!next) return null;
    if (/^https?:\/\//i.test(next)) return next;
    const origin = new URL(this.baseUrl).origin;
    return `${origin}${next.startsWith('/') ? '' : '/'}${next}`;
  }
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => { clearTimeout(t); resolve(); }, {
      once: true,
    });
  });
}
