import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { REALM_KEY } from '../decorators/realm.decorator';
import type { AuthRealm } from '../auth/realm';

/**
 * Primary HTTP auth gate. Always runs Passport's JWT strategy so `req.user`
 * is populated whenever a Bearer token is present — including on `@Public()`
 * routes, which lets endpoints like `/properties` auto-scope for an
 * authenticated AGENT without rejecting anonymous public-site callers.
 *
 * Routes marked `@Realm('academy')` are completely skipped here; the
 * academy surface runs its own strategy via `JwtAcademyAuthGuard` attached
 * with `@UseGuards`, so this global admin gate must not reject their
 * Bearer tokens (which carry a different realm claim the admin strategy
 * refuses).
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt-access') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const realm = this.reflector.getAllAndOverride<AuthRealm | undefined>(
      REALM_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (realm === 'academy') {
      // Academy realm routes carry tokens the admin strategy rejects by
      // design. Let them pass through here — their own @UseGuards layer
      // enforces the academy strategy.
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest<TUser>(
    err: Error | null,
    user: TUser | false,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      // Anonymous visitor on a public route is fine. Returning `null` leaves
      // `req.user` undefined; @CurrentUser() yields null for those calls.
      return (user || null) as unknown as TUser;
    }
    if (err || !user) throw err || new UnauthorizedException();
    return user as TUser;
  }
}
