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
import { SiteId } from '../common/site';

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
    // Validate any city slugs touched on this PATCH so dead keys can't sneak
    // into the curation lists. Other PATCH payloads (name, tagline, etc.)
    // are unaffected.
    if (dto.tgeHomepageCities !== undefined) {
      await this.assertCitiesExist(dto.tgeHomepageCities);
    }
    if (dto.reveryHomepageCities !== undefined) {
      await this.assertCitiesExist(dto.reveryHomepageCities);
    }

    const data: Prisma.SiteConfigUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.tagline !== undefined) data.tagline = toJson(dto.tagline);
    if (dto.description !== undefined)
      data.description = toJson(dto.description);
    if (dto.contact !== undefined) data.contact = toJson(dto.contact);
    if (dto.socialLinks !== undefined)
      data.socialLinks = toJson(dto.socialLinks);
    // Homepage curation arrays preserve order (rank = position), so do NOT
    // dedupe-sort — that would scramble the curated sequence. We still strip
    // duplicates while keeping first-occurrence order.
    if (dto.tgeHomepageCities !== undefined)
      data.tgeHomepageCities = this.dedupePreserveOrder(dto.tgeHomepageCities);
    if (dto.reveryHomepageCities !== undefined)
      data.reveryHomepageCities = this.dedupePreserveOrder(
        dto.reveryHomepageCities,
      );

    const updated = await this.prisma.siteConfig.update({
      where: { id: 'singleton' },
      data,
    });
    this.writeCache(updated);
    return updated;
  }

  /**
   * Ordered slug list driving the home-page "featured cities" section for the
   * given site. Returns an empty array for sites that don't have a curated
   * list (Admin, Academy, Unknown) — callers treat empty as "no curation
   * configured, fall back to default behaviour" so an unconfigured env never
   * blanks the home page. Degrades to empty on DB error rather than crashing
   * a public page.
   */
  async getHomepageCities(siteId: SiteId): Promise<readonly string[]> {
    if (siteId !== SiteId.TGE_LUXURY && siteId !== SiteId.REVERY) return [];
    const field =
      siteId === SiteId.TGE_LUXURY
        ? 'tgeHomepageCities'
        : 'reveryHomepageCities';

    const cached = this.readCache();
    if (cached) return cached[field];
    try {
      const config = await this.prisma.siteConfig.findUnique({
        where: { id: 'singleton' },
      });
      if (!config) return [];
      this.writeCache(config);
      return config[field];
    } catch (err) {
      this.logger.warn(
        `Falling back to empty homepage cities (${siteId}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return [];
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

  /**
   * Dedupe while keeping first-occurrence order. Used by the homepage curation
   * arrays where position IS the rank. A duplicate slug from a sloppy admin
   * paste is silently collapsed to its first appearance rather than rejected,
   * which matches the implicit semantics of an ordered set.
   */
  private dedupePreserveOrder(slugs: string[]): string[] {
    return Array.from(new Set(slugs));
  }

  /**
   * 400 on unknown slugs with the list attached so the admin UI can highlight
   * them. Single query (`slug IN (...)`) — cheap even for a full 45-city
   * payload. Used to validate homepage-cities curation lists.
   */
  private async assertCitiesExist(slugs: string[]): Promise<void> {
    if (slugs.length === 0) return;
    const unique = Array.from(new Set(slugs));
    const rows = await this.prisma.city.findMany({
      where: { slug: { in: unique } },
      select: { slug: true },
    });
    const known = new Set(rows.map((r) => r.slug));
    const missing = unique.filter((s) => !known.has(s));
    if (missing.length > 0) {
      throw new BadRequestException({
        message: 'Unknown city slugs',
        unknownSlugs: missing,
      });
    }
  }
}
