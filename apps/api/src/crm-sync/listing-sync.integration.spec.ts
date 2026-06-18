import { Brand, Prisma, PropertyStatus, PropertyTier } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { ListingSyncOrchestrator } from './core/listing-sync.orchestrator';
import { BrandRouteService } from './core/brand-route.service';
import { MediaMirrorService } from './core/media-mirror.service';
import { ListingWriteService } from './core/listing-write.service';
import { SyncLockService } from './core/sync-lock.service';
import { RebsClient } from './adapters/rebs/rebs.client';
import { RebsAdapter } from './adapters/rebs/rebs.adapter';
import type { RebsProperty } from './adapters/rebs/rebs.types';
import type { FinancialDataService } from '../financial-data/financial-data.service';
import type { UploadsService } from '../uploads/uploads.service';

/**
 * End-to-end of the whole pipeline against a REBS feed FIXTURE: the real
 * orchestrator + REBS adapter (with `fetch` stubbed to serve the fixture and
 * answer per-item liveness probes) driving every core stage — map →
 * brand-route → media-mirror → upsert → reconcile — over an in-memory Prisma
 * fake.
 *
 * Covers the upsert/quarantine/media/idempotency/human-field behaviours AND the
 * deletion-safety redesign: per-item 404 verification, the truncated-feed
 * guard, map-skipped-but-present exclusion, and the zero-feed guard.
 */

// ── In-memory Prisma fake (only the methods the pipeline touches) ──────────
class FakePrisma {
  properties: any[] = [];
  images: any[] = [];
  cities = new Map<string, { id: string; latitude: number | null; longitude: number | null }>();
  cityBrands = new Set<string>();
  locks = new Map<string, { source: string; owner: string; expiresAt: Date }>();
  private seq = 0;
  private id(p: string) {
    return `${p}-${++this.seq}`;
  }

  // Supports both the array form (image writes) and the interactive callback
  // form (the fenced unpublish), passing the fake itself as the tx client.
  $transaction = async (arg: any) =>
    typeof arg === 'function' ? arg(this) : Promise.all(arg);

  // Models the fencing read: `SELECT 1 FROM crm_sync_locks WHERE source=? AND
  // owner=? AND expires_at > NOW() FOR UPDATE`. Returns a row only when this
  // run still owns a live lease.
  $queryRaw = async (_strings: any, ...values: any[]) => {
    const [source, owner] = values;
    const lock = this.locks.get(source);
    return lock && lock.owner === owner && lock.expiresAt > new Date()
      ? [{ ok: 1 }]
      : [];
  };

  property = {
    findUnique: async ({ where }: any) => {
      if (where.source_external_id) {
        const { source, externalId } = where.source_external_id;
        return (
          this.properties.find(
            (p) => p.source === source && p.externalId === externalId,
          ) ?? null
        );
      }
      if (where.slug) return this.properties.find((p) => p.slug === where.slug) ?? null;
      if (where.id) return this.properties.find((p) => p.id === where.id) ?? null;
      return null;
    },
    findMany: async ({ where }: any) => {
      return this.properties.filter(
        (p) =>
          (where.source === undefined || p.source === where.source) &&
          (where.unpublishedAt === null ? p.unpublishedAt == null : true),
      );
    },
    create: async ({ data }: any) => {
      const row = { id: this.id('prop'), ...data };
      this.properties.push(row);
      return row;
    },
    update: async ({ where, data }: any) => {
      const row = this.properties.find((p) => p.id === where.id);
      Object.assign(row, data);
      return row;
    },
    updateMany: async ({ where, data }: any) => {
      let count = 0;
      for (const p of this.properties) {
        if (where.source !== undefined && p.source !== where.source) continue;
        if (where.externalId?.in && !where.externalId.in.includes(p.externalId)) continue;
        if (where.externalId?.notIn && where.externalId.notIn.includes(p.externalId)) continue;
        if (where.unpublishedAt === null && p.unpublishedAt != null) continue;
        Object.assign(p, data);
        count++;
      }
      return { count };
    },
  };

  propertyImage = {
    findMany: async ({ where }: any) => {
      return this.images.filter(
        (img) =>
          img.propertyId === where.propertyId &&
          (where.sourceUrl?.not === null ? img.sourceUrl != null : true),
      );
    },
    deleteMany: async ({ where }: any) => {
      const ids: string[] = where.id?.in ?? [];
      const before = this.images.length;
      this.images = this.images.filter((img) => !ids.includes(img.id));
      return { count: before - this.images.length };
    },
    createMany: async ({ data }: any) => {
      for (const row of data) this.images.push({ id: this.id('img'), ...row });
      return { count: data.length };
    },
  };

  city = {
    findUnique: async ({ where }: any) => this.cities.get(where.slug) ?? null,
  };

  cityBrand = {
    upsert: async ({ where }: any) => {
      const { cityId, brand } = where.cityId_brand;
      this.cityBrands.add(`${cityId}:${brand}`);
      return {};
    },
  };

  // Leased row-lock. `create` throws P2002 on a held lease; `updateMany`
  // models the expired-lease takeover and the heartbeat; `deleteMany` releases.
  crmSyncLock = {
    create: async ({ data }: any) => {
      if (this.locks.has(data.source)) {
        throw new Prisma.PrismaClientKnownRequestError('duplicate lock', {
          code: 'P2002',
          clientVersion: 'test',
        });
      }
      this.locks.set(data.source, { ...data });
      return { ...data };
    },
    updateMany: async ({ where, data }: any) => {
      let count = 0;
      for (const [source, row] of this.locks) {
        if (where.source !== undefined && source !== where.source) continue;
        if (where.owner !== undefined && row.owner !== where.owner) continue;
        if (where.expiresAt?.lt && !(row.expiresAt < where.expiresAt.lt)) continue;
        Object.assign(row, data);
        count++;
      }
      return { count };
    },
    deleteMany: async ({ where }: any) => {
      let count = 0;
      for (const [source, row] of [...this.locks]) {
        if (where.source !== undefined && source !== where.source) continue;
        if (where.owner !== undefined && row.owner !== where.owner) continue;
        this.locks.delete(source);
        count++;
      }
      return { count };
    },
  };
}

// ── Fixture + harness ──────────────────────────────────────────────────────
function rebsListing(over: Partial<RebsProperty> = {}): RebsProperty {
  return {
    internal_id: 'REBS-1',
    property_type: 'Apartament',
    for_sale: true,
    price_sale: 200000,
    currency_sale: 'EUR',
    title: 'Apartament 2 camere',
    description: 'Frumos apartament.',
    city: 'Cluj-Napoca',
    zone: 'Centru',
    lat: 46.77,
    lng: 23.6,
    bedrooms: 2,
    surface_total: 60,
    full_images: ['https://cdn.rebs.ro/REBS-1/a.jpg'],
    thumbnail: 'https://cdn.rebs.ro/REBS-1/thumb.jpg',
    ...over,
  } as RebsProperty;
}

describe('CRM listing sync — integration over a REBS fixture', () => {
  let prisma: FakePrisma;
  let orchestrator: ListingSyncOrchestrator;
  let uploads: { uploadFromUrl: jest.Mock; deleteFile: jest.Mock };
  let feed: RebsProperty[];
  let feedTotalCount: number | null; // null → mirror feed.length (the common case)
  let deadIds: Set<string>; // ids whose detail GET should 404 (genuinely removed)
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    prisma = new FakePrisma();
    prisma.cities.set('cluj-napoca', { id: 'city-cluj', latitude: 46.77, longitude: 23.6 });

    let imgN = 0;
    uploads = {
      uploadFromUrl: jest.fn(async (url: string, dir: string) => {
        imgN++;
        return {
          publicUrl: `https://cdn.local/${dir}/${imgN}.jpg`,
          filePath: `${dir}/${imgN}.jpg`,
          originalName: url,
          mimeType: 'image/jpeg',
          size: 1,
        };
      }),
      deleteFile: jest.fn(async () => undefined),
    };

    const financial = {
      getEurRonRate: jest.fn(async () => 5),
    } as unknown as FinancialDataService;

    const config = {
      get: (k: string) =>
        ({
          REBS_BASE_URL: 'https://demo.crmrebs.com/api/public',
          REBS_API_KEY: 'test-key',
          REBS_SYNC_ENABLED: '1',
          CRM_IMAGE_HOST_ALLOWLIST: 'crmrebs.com',
        })[k],
    } as unknown as ConfigService;

    const client = new RebsClient(config);
    const adapter = new RebsAdapter(client);
    const brandRoute = new BrandRouteService(financial);
    const media = new MediaMirrorService(uploads as unknown as UploadsService, config);
    const writer = new ListingWriteService(prisma as any, media);
    const lock = new SyncLockService(prisma as any);
    orchestrator = new ListingSyncOrchestrator(
      adapter,
      brandRoute,
      writer,
      lock,
      prisma as any,
      config,
    );

    feed = [rebsListing()];
    feedTotalCount = null;
    deadIds = new Set();
    fetchSpy = jest
      .spyOn(global, 'fetch' as any)
      .mockImplementation(async (input: any) => {
        const url = String(input);
        // Per-item liveness probe: GET /property/{id}/ (no query string).
        const detail = url.match(/\/property\/([^/?]+)\/$/);
        if (detail) {
          const id = decodeURIComponent(detail[1]);
          const status = deadIds.has(id) ? 404 : 200;
          return { ok: status === 200, status, json: async () => ({}) } as any;
        }
        // Feed page.
        return {
          ok: true,
          status: 200,
          json: async () => ({
            meta: {
              next: null,
              limit: 50,
              offset: 0,
              total_count: feedTotalCount ?? feed.length,
            },
            objects: feed,
          }),
        } as any;
      });
  });

  afterEach(() => fetchSpy.mockRestore());

  it('imports a for-sale listing into REVERY/affordable, keyed on (source, externalId)', async () => {
    const summary = await orchestrator.run();

    expect(summary).toMatchObject({ ran: true, fetched: 1, created: 1, errors: 0 });
    expect(prisma.properties).toHaveLength(1);
    const p = prisma.properties[0];
    expect(p.source).toBe('rebs');
    expect(p.externalId).toBe('REBS-1');
    expect(p.tier).toBe(PropertyTier.affordable);
    expect(p.status).toBe(PropertyStatus.available);
    expect(p.unpublishedAt).toBeNull();
    expect(p.cityId).toBe('city-cluj');
    expect(prisma.cityBrands.has(`city-cluj:${Brand.revery}`)).toBe(true);
  });

  it('mirrors images to storage (thumbnail first), self-hosting them', async () => {
    await orchestrator.run();
    expect(uploads.uploadFromUrl).toHaveBeenCalledTimes(2); // thumb + one full
    // SSRF allowlist is threaded through to the upload call.
    expect(uploads.uploadFromUrl).toHaveBeenCalledWith(
      expect.any(String),
      'properties',
      expect.objectContaining({ allowedHosts: ['crmrebs.com'] }),
    );
    const imgs = prisma.images.filter((i) => i.propertyId === prisma.properties[0].id);
    expect(imgs).toHaveLength(2);
    expect(imgs.every((i) => i.src.startsWith('https://cdn.local/'))).toBe(true);
    const hero = imgs.find((i) => i.isHero);
    expect(hero.sourceUrl).toBe('https://cdn.rebs.ro/REBS-1/thumb.jpg');
  });

  it('quarantines a listing whose city is unknown (imported but unpublished)', async () => {
    feed = [rebsListing({ internal_id: 'REBS-X', city: 'Orașul Necunoscut' })];
    const summary = await orchestrator.run();
    expect(summary).toMatchObject({ created: 1, quarantined: 1 });
    expect(prisma.properties[0].unpublishedAt).toBeInstanceOf(Date);
    expect(prisma.properties[0].cityId).toBeNull();
  });

  it('is idempotent: a second identical run creates nothing and re-downloads nothing', async () => {
    await orchestrator.run();
    const firstId = prisma.properties[0].id;
    const firstSlug = prisma.properties[0].slug;
    uploads.uploadFromUrl.mockClear();

    const second = await orchestrator.run();
    expect(second).toMatchObject({ created: 0, updated: 1, mediaDownloaded: 0, mediaReused: 2 });
    expect(prisma.properties).toHaveLength(1);
    expect(prisma.properties[0].id).toBe(firstId);
    expect(prisma.properties[0].slug).toBe(firstSlug);
    expect(uploads.uploadFromUrl).not.toHaveBeenCalled();
  });

  it('protects human-owned fields: a sold / luxury-promoted row survives a re-sync', async () => {
    await orchestrator.run();
    const p = prisma.properties[0];
    p.status = PropertyStatus.sold;
    p.tier = PropertyTier.luxury;

    feed = [rebsListing({ price_sale: 222000 })];
    await orchestrator.run();

    const after = prisma.properties[0];
    expect(after.status).toBe(PropertyStatus.sold);
    expect(after.tier).toBe(PropertyTier.luxury);
    expect(after.price).toBe(222000);
  });

  it('aborts without deleting when the feed walk errors', async () => {
    feed = [rebsListing({ internal_id: 'REBS-1' }), rebsListing({ internal_id: 'REBS-2' })];
    await orchestrator.run();

    fetchSpy.mockImplementation(async () => ({ ok: false, status: 500 }) as any);
    const summary = await orchestrator.run();

    expect(summary.error).toBeDefined();
    expect(summary.unpublished).toBe(0);
    expect(prisma.properties.every((p) => p.unpublishedAt == null)).toBe(true);
  }, 15000); // RebsClient retries the failing page with backoff (~6s) before giving up

  // ── Deletion safety (the redesign) ─────────────────────────────────────────

  it('unpublishes a listing only after a genuine per-item 404 (never on mere absence)', async () => {
    feed = [rebsListing({ internal_id: 'REBS-1' }), rebsListing({ internal_id: 'REBS-2' })];
    await orchestrator.run();
    expect(prisma.properties).toHaveLength(2);

    // REBS-2 drops from the feed but its detail endpoint still returns 200 →
    // treated as a transient drop, NOT a deletion.
    feed = [rebsListing({ internal_id: 'REBS-1' })];
    let summary = await orchestrator.run();
    expect(summary.unpublished).toBe(0);
    expect(
      prisma.properties.find((p) => p.externalId === 'REBS-2').unpublishedAt,
    ).toBeNull();

    // Now its detail endpoint 404s → confirmed removed → unpublished (not deleted).
    deadIds = new Set(['REBS-2']);
    summary = await orchestrator.run();
    expect(summary.unpublished).toBe(1);
    expect(prisma.properties).toHaveLength(2); // soft, not hard-deleted
    expect(
      prisma.properties.find((p) => p.externalId === 'REBS-2').unpublishedAt,
    ).toBeInstanceOf(Date);
    expect(
      prisma.properties.find((p) => p.externalId === 'REBS-1').unpublishedAt,
    ).toBeNull();
  });

  it('does NOT reconcile when the feed is truncated (walked < total_count)', async () => {
    feed = [rebsListing({ internal_id: 'REBS-1' }), rebsListing({ internal_id: 'REBS-2' })];
    await orchestrator.run();

    // Feed now returns only REBS-1 but its own total_count still claims 2 →
    // the walk is partial; reconcile must be skipped entirely.
    feed = [rebsListing({ internal_id: 'REBS-1' })];
    feedTotalCount = 2;
    deadIds = new Set(['REBS-2']); // even though it WOULD 404, we must not probe
    const summary = await orchestrator.run();

    expect(summary.unpublished).toBe(0);
    expect(prisma.properties.every((p) => p.unpublishedAt == null)).toBe(true);
  });

  it('does NOT unpublish a listing that is present-but-map-skipped (e.g. went not-for-sale)', async () => {
    feed = [rebsListing({ internal_id: 'REBS-1' }), rebsListing({ internal_id: 'REBS-2' })];
    await orchestrator.run();
    expect(prisma.properties).toHaveLength(2);

    // REBS-2 is still IN the feed but flips to not-for-sale → mapper skips it.
    // It is SEEN, so it must not be treated as absent/deleted.
    feed = [
      rebsListing({ internal_id: 'REBS-1' }),
      rebsListing({ internal_id: 'REBS-2', for_sale: false, for_rent: true }),
    ];
    deadIds = new Set(['REBS-2']); // a probe would 404 — but we must never probe it
    const summary = await orchestrator.run();

    expect(summary.unpublished).toBe(0);
    expect(
      prisma.properties.find((p) => p.externalId === 'REBS-2').unpublishedAt,
    ).toBeNull();
  });

  it('does NOT reconcile a zero-listing feed (upstream anomaly, not a mass sale)', async () => {
    feed = [rebsListing({ internal_id: 'REBS-1' }), rebsListing({ internal_id: 'REBS-2' })];
    await orchestrator.run();

    feed = [];
    feedTotalCount = 0; // genuinely-empty page (not truncated) — still refuse
    const summary = await orchestrator.run();

    expect(summary.unpublished).toBe(0);
    expect(prisma.properties.every((p) => p.unpublishedAt == null)).toBe(true);
  });

  it('does NOT unpublish if the lease is stolen mid-run (fencing guards the write)', async () => {
    feed = [rebsListing({ internal_id: 'REBS-1' }), rebsListing({ internal_id: 'REBS-2' })];
    await orchestrator.run();

    // REBS-2 genuinely 404s, so absent normal conditions it WOULD be unpublished.
    feed = [rebsListing({ internal_id: 'REBS-1' })];
    deadIds = new Set(['REBS-2']);
    // Simulate another instance taking over the lease during the walk (e.g. we
    // stalled past the lease): rewrite the lock owner before reconcile runs.
    const inner = fetchSpy.getMockImplementation()!;
    fetchSpy.mockImplementation(async (input: any) => {
      const res = await inner(input);
      const lock = prisma.locks.get('rebs');
      if (lock) lock.owner = 'another-instance';
      return res;
    });

    const summary = await orchestrator.run();

    expect(summary.unpublished).toBe(0); // fenced out — no write
    expect(
      prisma.properties.find((p) => p.externalId === 'REBS-2').unpublishedAt,
    ).toBeNull();
  });

  it('skips a listing whose currency is missing (never stored as EUR by default)', async () => {
    feed = [rebsListing({ internal_id: 'REBS-1', currency_sale: null as any })];
    const summary = await orchestrator.run();
    expect(summary.fetched).toBe(0); // skipped at the mapper, nothing imported
    expect(prisma.properties).toHaveLength(0);
  });

  // ── Probe-error & completeness guards (H1 / M2 regression defenders) ────────

  it('does NOT unpublish when the liveness probe errors (5xx ≠ 404)', async () => {
    feed = [rebsListing({ internal_id: 'REBS-1' }), rebsListing({ internal_id: 'REBS-2' })];
    await orchestrator.run();

    // REBS-2 drops from the feed, and its detail endpoint is now brownout-503.
    // A non-404 error is UNCERTAINTY, not a removal — it must stay published.
    feed = [rebsListing({ internal_id: 'REBS-1' })];
    fetchSpy.mockImplementation(async (input: any) => {
      const url = String(input);
      const detail = url.match(/\/property\/([^/?]+)\/$/);
      if (detail) return { ok: false, status: 503, json: async () => ({}) } as any;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          meta: { next: null, limit: 50, offset: 0, total_count: feed.length },
          objects: feed,
        }),
      } as any;
    });

    const summary = await orchestrator.run();
    expect(summary.unpublished).toBe(0);
    expect(
      prisma.properties.find((p) => p.externalId === 'REBS-2').unpublishedAt,
    ).toBeNull();
  });

  it('does NOT reconcile when the feed omits total_count (untrusted → no deletions)', async () => {
    feed = [rebsListing({ internal_id: 'REBS-1' }), rebsListing({ internal_id: 'REBS-2' })];
    await orchestrator.run();

    // REBS-2 leaves the feed and WOULD 404 — but a feed with no declared total
    // is not trustworthy for deletion, so we must never even probe it.
    feed = [rebsListing({ internal_id: 'REBS-1' })];
    deadIds = new Set(['REBS-2']);
    fetchSpy.mockImplementation(async (input: any) => {
      const url = String(input);
      const detail = url.match(/\/property\/([^/?]+)\/$/);
      if (detail) {
        const id = decodeURIComponent(detail[1]);
        const status = deadIds.has(id) ? 404 : 200;
        return { ok: status === 200, status, json: async () => ({}) } as any;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          meta: { next: null, limit: 50, offset: 0 }, // ← no total_count
          objects: feed,
        }),
      } as any;
    });

    const summary = await orchestrator.run();
    expect(summary.unpublished).toBe(0);
    expect(prisma.properties.every((p) => p.unpublishedAt == null)).toBe(true);
  });

  it('discards a confirmed removal when the probe circuit-breaker trips mid-phase', async () => {
    // One genuinely-removed listing (REBS-2 → 404) plus enough probe-erroring
    // ones (503) to trip the consecutive-error breaker. ALL-OR-NOTHING: a tripped
    // phase commits nothing, so even the confirmed 404 must NOT be unpublished.
    const ids = ['REBS-1', 'REBS-2', 'REBS-3', 'REBS-4', 'REBS-5'];
    feed = ids.map((id) => rebsListing({ internal_id: id }));
    await orchestrator.run();

    feed = [rebsListing({ internal_id: 'REBS-1' })]; // 2..5 drop from the feed
    const dead = new Set(['REBS-2']);
    fetchSpy.mockImplementation(async (input: any) => {
      const url = String(input);
      const detail = url.match(/\/property\/([^/?]+)\/$/);
      if (detail) {
        const id = decodeURIComponent(detail[1]);
        const status = dead.has(id) ? 404 : 503;
        return { ok: false, status, json: async () => ({}) } as any;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          meta: { next: null, limit: 50, offset: 0, total_count: feed.length },
          objects: feed,
        }),
      } as any;
    });

    const summary = await orchestrator.run();
    expect(summary.unpublished).toBe(0);
    expect(prisma.properties.every((p) => p.unpublishedAt == null)).toBe(true);
  });
});
