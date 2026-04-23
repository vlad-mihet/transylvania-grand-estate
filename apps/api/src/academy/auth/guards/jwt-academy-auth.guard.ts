import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';

/**
 * Per-route guard for the academy surface. Unlike the admin `JwtAuthGuard`
 * (which is registered globally as an APP_GUARD), this one is attached with
 * `@UseGuards` to academy controllers so the admin guard can stay global
 * without dispatching on realm — each surface brings its own strategy.
 *
 * Honors `@Public()` so login / accept-invite / Google-start endpoints can
 * run unauthenticated.
 */
@Injectable()
export class JwtAcademyAuthGuard extends AuthGuard('jwt-academy-access') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  handleRequest<TUser>(
    err: Error | null,
    user: TUser | false,
  ): TUser {
    if (err || !user) throw err || new UnauthorizedException();
    return user as TUser;
  }
}
