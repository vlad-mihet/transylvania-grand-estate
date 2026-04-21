import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Primary HTTP auth gate. Always runs Passport's JWT strategy so `req.user`
 * is populated whenever a Bearer token is present — including on `@Public()`
 * routes, which lets endpoints like `/properties` auto-scope for an
 * authenticated AGENT without rejecting anonymous public-site callers.
 *
 * `handleRequest` decides whether a missing / invalid token is fatal:
 * public routes tolerate it (user stays unauthenticated), protected routes
 * throw 401.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt-access') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
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
