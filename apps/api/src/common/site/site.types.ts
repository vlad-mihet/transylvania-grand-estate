import { PropertyTier } from '@prisma/client';

export enum SiteId {
  TGE_LUXURY = 'TGE_LUXURY',
  REVERIA = 'REVERIA',
  ADMIN = 'ADMIN',
  ACADEMY = 'ACADEMY',
  UNKNOWN = 'UNKNOWN',
}

export interface SiteContext {
  id: SiteId;
  origin: string | null;
}

// Tiers a given site is allowed to read. ADMIN sees everything; public sites
// are pinned to a single tier so a Reveria-origin request can never surface
// luxury inventory even if the client hand-crafts a `tier=luxury` query.
// ACADEMY is not a property surface — empty array means "no property rows",
// which is the right default since academy requests never ask for property
// inventory.
export const SITE_TIER_SCOPE: Record<SiteId, PropertyTier[] | null> = {
  [SiteId.TGE_LUXURY]: [PropertyTier.luxury],
  [SiteId.REVERIA]: [PropertyTier.affordable],
  [SiteId.ADMIN]: null,
  [SiteId.ACADEMY]: [],
  [SiteId.UNKNOWN]: [],
};

declare module 'express-serve-static-core' {
  interface Request {
    site?: SiteContext;
  }
}
