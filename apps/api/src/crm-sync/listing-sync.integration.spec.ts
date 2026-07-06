import { Brand, PropertyStatus, PropertyTier } from '@prisma/client';
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
 * orchestrator + REBS adapter (with `fetch` stubbed to serve the fixture)
 * driving every core stage — map → brand-route → media-mirror → upsert →
 * reconcile — over an in-memory Prisma fake.
 *
 * Locks the four behaviours from the plan's verification section:
 *   1. upsert keyed on (source, externalId)
 *   2. images mirrored to storage (downloaded once, then reused)
 *   3. a listing dropped from the feed is soft-unpublished (never deleted)
 *   4. a human-edited row (sold / promoted to luxury) survives a re-sync
 *  plus idempotency (a second identical run creates nothing, re-downloads nothing)
 *  and unknown-city quarantine.
 */

// ── In-memory Prisma fake (only the methods the pipeline touches) ──────────
class FakePrisma {
  properties: any[] = [];
  images: any[] = [];
  cities = new Map<string, { id: string; latitude: number | null; longitude: number | null }>();
  cityBrands = new Set<string>();
  private seq = 0;
  private id(p: string) {
    return `${p}-${++this.seq}`;
  }

  // Advisory lock — always granted in the fake.
  $queryRaw = jest.fn(async () => [{ locked: true }]);
  // Supports both forms: array-of-ops, and the interactive callback the
  // xact-scoped sync lock uses (callback receives this fake as `tx`).
  $transaction = async (
    arg: Promise<unknown>[] | ((tx: unknown) => Promise<unknown>),
    _opts?: unknown,
  ) => (typeof arg === 'function' ? arg(this) : Promise.all(arg));

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
        const notIn: string[] = where.externalId?.notIn ?? [];
        if (
          p.source === where.source &&
          !notIn.includes(p.externalId) &&
          (where.unpublishedAt === null ? p.unpublishedAt == null : true)
        ) {
          Object.assign(p, data);
          count++;
        }
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
}

// ── Fixture + harness ──────────────────────────────────────────────────────
function rebsListing(over: Partial<RebsProperty> = {}): RebsProperty {
  return {
    internal_id: 'REBS-1',
    property_type: 1, // 1 = Apartment
    for_sale: true,
    price_sale: 200000,
    currency_sale: 1, // 1 = EUR
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
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    prisma = new FakePrisma();
    // Known city so listings publish; unknown ones quarantine.
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
        })[k],
    } as unknown as ConfigService;

    const client = new RebsClient(config);
    const adapter = new RebsAdapter(client);
    const brandRoute = new BrandRouteService(financial);
    const media = new MediaMirrorService(uploads as unknown as UploadsService);
    const writer = new ListingWriteService(prisma as any, media);
    const lock = new SyncLockService(prisma as any);
    orchestrator = new ListingSyncOrchestrator(
      adapter,
      brandRoute,
      writer,
      lock,
      prisma as any,
    );

    feed = [rebsListing()];
    fetchSpy = jest
      .spyOn(global, 'fetch' as any)
      .mockImplementation(
        async () =>
          ({
            ok: true,
            status: 200,
            json: async () => ({
              meta: { next: null, limit: 50, offset: 0, total_count: feed.length },
              objects: feed,
            }),
          }) as any,
      );
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
    // City brand membership ensured so the import is actually visible.
    expect(prisma.cityBrands.has(`city-cluj:${Brand.revery}`)).toBe(true);
  });

  it('mirrors images to storage (thumbnail first), self-hosting them', async () => {
    await orchestrator.run();
    expect(uploads.uploadFromUrl).toHaveBeenCalledTimes(2); // thumb + one full
    const imgs = prisma.images.filter((i) => i.propertyId === prisma.properties[0].id);
    expect(imgs).toHaveLength(2);
    expect(imgs.every((i) => i.src.startsWith('https://cdn.local/'))).toBe(true);
    expect(imgs.every((i) => i.storageKey && i.sourceUrl)).toBe(true);
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
    expect(prisma.properties[0].id).toBe(firstId); // upserted, not duplicated
    expect(prisma.properties[0].slug).toBe(firstSlug); // slug stable
    expect(uploads.uploadFromUrl).not.toHaveBeenCalled();
  });

  it('soft-unpublishes a listing that drops out of the feed (never deletes)', async () => {
    feed = [rebsListing({ internal_id: 'REBS-1' }), rebsListing({ internal_id: 'REBS-2' })];
    await orchestrator.run();
    expect(prisma.properties).toHaveLength(2);

    feed = [rebsListing({ internal_id: 'REBS-1' })]; // REBS-2 gone
    const summary = await orchestrator.run();

    expect(summary.unpublished).toBe(1);
    expect(prisma.properties).toHaveLength(2); // not deleted
    const gone = prisma.properties.find((p) => p.externalId === 'REBS-2');
    const live = prisma.properties.find((p) => p.externalId === 'REBS-1');
    expect(gone.unpublishedAt).toBeInstanceOf(Date);
    expect(live.unpublishedAt).toBeNull();
  });

  it('protects human-owned fields: a sold / luxury-promoted row survives a re-sync', async () => {
    await orchestrator.run();
    const p = prisma.properties[0];
    // Simulate an admin marking it sold and promoting it to the TGE/luxury tier.
    p.status = PropertyStatus.sold;
    p.tier = PropertyTier.luxury;

    // Feed still carries it, with a changed price (sync-owned → should refresh).
    feed = [rebsListing({ price_sale: 222000 })];
    await orchestrator.run();

    const after = prisma.properties[0];
    expect(after.status).toBe(PropertyStatus.sold); // NOT reverted to available
    expect(after.tier).toBe(PropertyTier.luxury); // promotion preserved
    expect(after.price).toBe(222000); // content still refreshed
  });

  it('aborts without deleting when the feed walk errors', async () => {
    feed = [rebsListing({ internal_id: 'REBS-1' }), rebsListing({ internal_id: 'REBS-2' })];
    await orchestrator.run();

    // Make every page fetch fail on the next run.
    fetchSpy.mockImplementation(async () => ({ ok: false, status: 500 }) as any);
    const summary = await orchestrator.run();

    expect(summary.error).toBeDefined();
    expect(summary.unpublished).toBe(0); // never deletes on a feed error
    expect(prisma.properties.every((p) => p.unpublishedAt == null)).toBe(true);
  }, 15000); // RebsClient retries the failing page with backoff (~6s) before giving up
});
