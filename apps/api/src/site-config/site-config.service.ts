import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SiteConfig } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSiteConfigDto } from './dto/update-site-config.dto';
import { toJson } from '../common/utils/prisma-json';

/**
 * Fallback allowlist used when the DB row is missing or its scope is empty.
 * Matches the strict historical Transylvania (10 counties). Keeping this
 * frozen (not a class field) so no code path can mutate it at runtime.
 */
const DEFAULT_TGE_COUNTY_SCOPE: readonly string[] = Object.freeze([
  'alba',
  'bistrita-nasaud',
  'brasov',
  'cluj',
  'covasna',
  'harghita',
  'hunedoara',
  'mures',
  'salaj',
  'sibiu',
]);

/**
 * Cache TTL for the singleton row. Reads on the scoped hot path (every
 * `/properties`, `/cities`, nested agents/developers include) must not
 * round-trip to Postgres, but a multi-node deploy (Fly.io scales horizontally
 * by default) means a PATCH on one instance leaves every other instance's
 * in-process cache stale until something evicts it. A 30-second TTL bounds
 * that divergence without giving up steady-state perf:
 *   - ~20 req/s per instance × 30s = ~600 cache hits per DB miss (98% hit rate)
 *   - Admin toggles propagate fleet-wide inside 30s with zero infra
 *   - No Postgres LISTEN/NOTIFY or Redis dependency
 * Same-instance writes still invalidate immediately so the acting admin
 * sees their change on the next read.
 */
const CACHE_TTL_MS = 30_000;

interface CachedConfig {
  value: SiteConfig;
  at: number;
}

@Injectable()
export class SiteConfigService {
  private readonly logger = new Logger(SiteConfigService.name);
  private cached: CachedConfig | null = null;

  constructor(private prisma: PrismaService) {}

  async get() {
    const fromCache = this.readCache();
    if (fromCache) return fromCache;
    const config = await this.prisma.siteConfig.findUnique({
      where: { id: 'singleton' },
    });
    if (!config) throw new NotFoundException('Site config not found');
    this.writeCache(config);
    return config;
  }

  async update(dto: UpdateSiteConfigDto) {
    // Reject unknown county slugs up-front so we never persist dead keys
    // that silently filter no rows. Only runs when the caller is actually
    // touching the scope — other PATCH payloads (name, tagline, etc.) are
    // unaffected.
    if (dto.tgeCountyScope !== undefined) {
      await this.assertCountiesExist(dto.tgeCountyScope);
    }

    const data: Prisma.SiteConfigUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.tagline !== undefined) data.tagline = toJson(dto.tagline);
    if (dto.description !== undefined)
      data.description = toJson(dto.description);
    if (dto.contact !== undefined) data.contact = toJson(dto.contact);
    if (dto.socialLinks !== undefined)
      data.socialLinks = toJson(dto.socialLinks);
    if (dto.tgeCountyScope !== undefined)
      data.tgeCountyScope = this.dedupeSorted(dto.tgeCountyScope);

    const updated = await this.prisma.siteConfig.update({
      where: { id: 'singleton' },
      data,
    });
    this.writeCache(updated);
    return updated;
  }

  /**
   * Idempotent single-slug add. Used by the per-row toggle in the admin
   * counties page. Atomic at the DB layer (Postgres `array_append` guarded
   * against duplicates) so concurrent toggles on different slugs can't
   * clobber each other — the classic lost-update anomaly of whole-array
   * PATCHes under two admins editing at once.
   */
  async addTgeCountyScope(slug: string): Promise<SiteConfig> {
    await this.assertCountyExists(slug);
    await this.prisma.$executeRaw`
      UPDATE site_config
      SET tge_county_scope = array_append(tge_county_scope, ${slug})
      WHERE id = 'singleton' AND NOT (${slug} = ANY(tge_county_scope))
    `;
    return this.reloadAndCache();
  }

  /** Idempotent single-slug remove. `array_remove` is a no-op if absent. */
  async removeTgeCountyScope(slug: string): Promise<SiteConfig> {
    // No existence check needed — removing an unknown slug is a safe no-op
    // and the caller might be cleaning up a stale entry after a rename.
    await this.prisma.$executeRaw`
      UPDATE site_config
      SET tge_county_scope = array_remove(tge_county_scope, ${slug})
      WHERE id = 'singleton'
    `;
    return this.reloadAndCache();
  }

  /**
   * Allowlist of county slugs the TGE landing site is permitted to show.
   *
   * Resilience layers:
   *   1. Hot-path cache with TTL → < 1ms typical.
   *   2. DB fallback when cache is cold.
   *   3. Empty persisted array → hard-coded Transylvania default.
   *   4. Missing singleton row → hard-coded default (for unseeded envs).
   *   5. DB error → hard-coded default + warning log. A Postgres blip must
   *      not 500 every TGE page; serving the canonical Transylvania set is
   *      the closest thing to correct we can do without DB access.
   */
  async getTgeCountyScope(): Promise<readonly string[]> {
    const cached = this.readCache();
    if (cached) {
      return cached.tgeCountyScope.length === 0
        ? DEFAULT_TGE_COUNTY_SCOPE
        : cached.tgeCountyScope;
    }
    try {
      const config = await this.prisma.siteConfig.findUnique({
        where: { id: 'singleton' },
      });
      if (!config) return DEFAULT_TGE_COUNTY_SCOPE;
      this.writeCache(config);
      return config.tgeCountyScope.length === 0
        ? DEFAULT_TGE_COUNTY_SCOPE
        : config.tgeCountyScope;
    } catch (err) {
      // Structured warn (not error) because we are degrading gracefully.
      // The alerting path should watch the Prisma / DB error metrics, not
      // this log — but this gives a breadcrumb for post-mortems.
      this.logger.warn(
        `Falling back to default TGE county scope: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return DEFAULT_TGE_COUNTY_SCOPE;
    }
  }

  // ── internals ──────────────────────────────────────────────────────────

  private readCache(): SiteConfig | null {
    if (!this.cached) return null;
    if (Date.now() - this.cached.at > CACHE_TTL_MS) {
      this.cached = null;
      return null;
    }
    return this.cached.value;
  }

  private writeCache(value: SiteConfig) {
    this.cached = { value, at: Date.now() };
  }

  private async reloadAndCache(): Promise<SiteConfig> {
    const config = await this.prisma.siteConfig.findUnique({
      where: { id: 'singleton' },
    });
    if (!config) throw new NotFoundException('Site config not found');
    this.writeCache(config);
    return config;
  }

  private dedupeSorted(slugs: string[]): string[] {
    return Array.from(new Set(slugs)).sort();
  }

  private async assertCountyExists(slug: string): Promise<void> {
    const found = await this.prisma.county.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!found) {
      throw new NotFoundException(`County not found: ${slug}`);
    }
  }

  /**
   * 400 on unknown slugs with the list attached so the admin UI can highlight
   * them. Single query (`slug IN (...)`) — cheap even for a full 42-county
   * payload.
   */
  private async assertCountiesExist(slugs: string[]): Promise<void> {
    if (slugs.length === 0) return;
    const unique = Array.from(new Set(slugs));
    const rows = await this.prisma.county.findMany({
      where: { slug: { in: unique } },
      select: { slug: true },
    });
    const known = new Set(rows.map((r) => r.slug));
    const missing = unique.filter((s) => !known.has(s));
    if (missing.length > 0) {
      throw new BadRequestException({
        message: 'Unknown county slugs',
        unknownSlugs: missing,
      });
    }
  }
}
