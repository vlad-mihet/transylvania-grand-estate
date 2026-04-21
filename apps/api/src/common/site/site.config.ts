import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DEV_ORIGINS } from './dev-origins';
import { SiteId } from './site.types';

@Injectable()
export class SiteOriginConfig {
  private readonly map: Map<string, SiteId>;

  constructor(config: ConfigService) {
    this.map = new Map();
    this.register(config.get<string>('ADMIN_ORIGIN'), SiteId.ADMIN);
    this.register(config.get<string>('TGE_ORIGIN'), SiteId.TGE_LUXURY);
    this.register(config.get<string>('REVERIA_ORIGIN'), SiteId.REVERIA);

    if (process.env.NODE_ENV !== 'production') {
      for (const [site, origins] of Object.entries(DEV_ORIGINS) as [
        Exclude<SiteId, SiteId.UNKNOWN>,
        string[],
      ][]) {
        for (const origin of origins) {
          if (!this.map.has(origin)) this.map.set(origin, site);
        }
      }
    }
  }

  resolve(origin: string | null | undefined): SiteId {
    if (!origin) return SiteId.UNKNOWN;
    return this.map.get(origin.toLowerCase()) ?? SiteId.UNKNOWN;
  }

  private register(raw: string | undefined, site: SiteId): void {
    if (!raw) return;
    for (const o of raw.split(',').map((s) => s.trim()).filter(Boolean)) {
      this.map.set(o.toLowerCase(), site);
    }
  }
}
