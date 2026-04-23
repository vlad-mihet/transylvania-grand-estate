import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { AuthRealm } from '../auth/realm';

/**
 * Shape of `req.user` populated by the academy JWT access strategy. No role
 * field — academy users don't participate in the admin RBAC model. `realm`
 * is always `'academy'` on this shape; admin tokens write
 * `CurrentUserPayload` via a different strategy.
 */
export interface AcademyUserPayload {
  id: string;
  email: string;
  name: string;
  realm: Extract<AuthRealm, 'academy'>;
}

/**
 * Inject the authenticated academy user on an academy-scoped endpoint.
 * Returns `null` when the route is @Public (no JWT strategy ran). Separate
 * from @CurrentUser so controllers can't accidentally mix admin and academy
 * payload shapes.
 */
export const CurrentAcademyUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AcademyUserPayload | null => {
    const req = ctx.switchToHttp().getRequest<{ user?: AcademyUserPayload }>();
    return req.user ?? null;
  },
);
