import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { AdminRole } from '@prisma/client';
import type { AuthRealm } from '../auth/realm';

/**
 * Shape of `req.user` populated by the admin JWT access strategy. `agentId`
 * is only present for AGENT-role users whose AdminUser row is linked to a
 * sales Agent. `realm` is always `'admin'` on this shape — academy tokens
 * are handled by a separate strategy that writes `AcademyUserPayload`.
 */
export interface CurrentUserPayload {
  id: string;
  email: string;
  role: AdminRole;
  agentId?: string | null;
  realm?: AuthRealm;
}

/**
 * Inject the authenticated user on an admin-scoped endpoint. Returns `null`
 * when the route is @Public (no JWT strategy ran) — controllers must handle
 * that case to support endpoints that are publicly readable but behave
 * differently when a user is present (e.g. `/properties` auto-scopes for AGENT).
 */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): CurrentUserPayload | null => {
    const req = ctx.switchToHttp().getRequest<{ user?: CurrentUserPayload }>();
    return req.user ?? null;
  },
);
