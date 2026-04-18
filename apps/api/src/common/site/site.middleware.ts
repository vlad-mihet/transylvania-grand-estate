import {
  BadRequestException,
  Injectable,
  Logger,
  NestMiddleware,
} from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { SiteOriginConfig } from './site.config';
import { SiteId } from './site.types';

const KNOWN_SITE_IDS = new Set<string>(Object.values(SiteId));

@Injectable()
export class SiteMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SiteMiddleware.name);

  constructor(private readonly origins: SiteOriginConfig) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const explicit = this.readExplicitSiteHeader(req);
    if (explicit) {
      req.site = { id: explicit, origin: null };
      res.setHeader('X-Site-Resolved', explicit);
      return next();
    }
    const origin = this.readOrigin(req);
    const id = this.origins.resolve(origin);
    req.site = { id, origin };
    res.setHeader('X-Site-Resolved', id);
    // UNKNOWN silently clamps to no tier scope (= no property results). In
    // dev that's almost always a misconfigured NEXT_PUBLIC_SITE_ID or a
    // new origin that hasn't been added to the map — log once so the
    // developer sees it.
    if (
      id === SiteId.UNKNOWN &&
      process.env.NODE_ENV !== 'production' &&
      !this.isIgnoredPath(req.url)
    ) {
      this.logger.warn(
        `Site = UNKNOWN for ${req.method} ${req.url} (origin=${origin ?? 'none'}, x-site=${req.headers['x-site'] ?? 'none'}) — property listings will return empty`,
      );
    }
    next();
  }

  private isIgnoredPath(url: string | undefined): boolean {
    if (!url) return true;
    // Swagger + uploads aren't tier-scoped; skip the noise.
    return url.startsWith('/api/docs') || url.startsWith('/uploads/');
  }

  /**
   * `X-Site` is the authoritative signal for server-side fetches (Next.js SSR
   * doesn't send an Origin header). Browser-originated requests still fall
   * through to Origin/Referer, which CORS also enforces. `X-Site` is not a
   * security boundary — mutations are guarded by JWT + @Roles — it's a brand
   * routing hint that lets each site stay pinned to its own tier.
   */
  private readExplicitSiteHeader(req: Request): SiteId | null {
    const raw = req.headers['x-site'];
    if (typeof raw !== 'string') return null;
    const value = raw.trim().toUpperCase();
    if (KNOWN_SITE_IDS.has(value)) return value as SiteId;
    // An explicit but unrecognised X-Site value is almost always a
    // misconfigured NEXT_PUBLIC_SITE_ID. Falling through to origin
    // resolution silently would hide that bug for hours; fail fast.
    throw new BadRequestException(
      `Invalid X-Site header: "${raw}". Expected one of: ${Array.from(KNOWN_SITE_IDS).join(', ')}`,
    );
  }

  private readOrigin(req: Request): string | null {
    const origin = req.headers.origin;
    if (typeof origin === 'string' && origin.length > 0) return origin;
    const referer = req.headers.referer;
    if (typeof referer === 'string' && referer.length > 0) {
      try {
        return new URL(referer).origin;
      } catch {
        return null;
      }
    }
    return null;
  }
}
