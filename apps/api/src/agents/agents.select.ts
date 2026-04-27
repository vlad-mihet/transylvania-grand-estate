import { AdminRole, Prisma } from '@prisma/client';
import type { CurrentUserPayload } from '../common/decorators/user.decorator';

/**
 * Public-safe Agent projection. Anonymous + AGENT-role callers see this on
 * /agents and on `property.agent`. Drops:
 *   - email      (unique PII; also enables enumeration)
 *   - adminUserId (links public profile to internal login surface)
 *   - invitation  (admin-only status pill data)
 *   - createdAt / updatedAt (admin telemetry)
 */
export const publicAgentSelect = {
  id: true,
  slug: true,
  firstName: true,
  lastName: true,
  phone: true,
  photo: true,
  bio: true,
  active: true,
} satisfies Prisma.AgentSelect;

/**
 * Admin/super-admin/editor projection — full row.
 *
 * `invitation` is a relation, not a scalar, so callers that need it must
 * compose it into their `select` explicitly (see AgentsService.findAll).
 */
export const adminAgentSelect = {
  id: true,
  slug: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  photo: true,
  bio: true,
  active: true,
  adminUserId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AgentSelect;

/**
 * True for callers we trust with admin fields (email, adminUserId, invitation
 * data, timestamps). AGENT is intentionally NOT trusted — they get the
 * public projection of every agent except their own. The /agents/me route
 * opts in via a `force` flag rather than relying on role.
 */
export function isTrustedCaller(
  user: CurrentUserPayload | null | undefined,
): boolean {
  return (
    user?.role === AdminRole.ADMIN ||
    user?.role === AdminRole.SUPER_ADMIN ||
    user?.role === AdminRole.EDITOR
  );
}

export function selectForCaller(
  user: CurrentUserPayload | null | undefined,
): Prisma.AgentSelect {
  return isTrustedCaller(user) ? adminAgentSelect : publicAgentSelect;
}
