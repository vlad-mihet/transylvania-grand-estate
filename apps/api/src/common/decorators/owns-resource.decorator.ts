import { SetMetadata } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';

export const OWNS_RESOURCE_KEY = 'ownsResource';

/**
 * Declarative config consumed by `OwnershipGuard`. The `resolve` callback
 * loads just enough of the target row to check ownership — do NOT fetch
 * the full record.
 *
 * `ownerField` is the dotted path on the resolved row that should match the
 * current user's `agentId`. Examples:
 *   - `"agentId"` for properties (direct column)
 *   - `"property.agentId"` for inquiries (via Prisma implicit relation)
 *   - `"adminUserId"` for agents (self-record via reverse link)
 */
export interface OwnsResourceConfig {
  resource: string;
  /** Route param holding the resource id. Defaults to `"id"`. */
  paramKey?: string;
  /** Database resolver that returns the ownership tuple (or null if not found). */
  resolve: (prisma: PrismaService, id: string) => Promise<unknown | null>;
  /** Dotted-path getter for the owner identifier on the resolved row. */
  ownerField: string;
  /**
   * Optional custom comparator. When present, it's called with (owner, user)
   * and its return value determines access. Lets `/agents/:id` compare against
   * `user.id` (the adminUser id, not the agentId).
   */
  compare?: (owner: unknown, user: { id: string; agentId: string | null }) => boolean;
}

/**
 * Decorate a mutating admin endpoint with the ownership policy. Short-circuits
 * for ADMIN / SUPER_ADMIN via the guard itself; enforces the check for AGENT.
 */
export const OwnsResource = (config: OwnsResourceConfig) =>
  SetMetadata(OWNS_RESOURCE_KEY, config);
