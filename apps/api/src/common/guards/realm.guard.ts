import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthRealm } from '../auth/realm';
import { REALM_KEY } from '../decorators/realm.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Enforces the `@Realm(...)` decorator. Wired globally in AppModule so every
 * non-public route is covered; runs after `JwtAuthGuard` + `RolesGuard`.
 *
 * Two default behaviors to keep in mind:
 *
 *  1. No `@Realm(...)` on a route → defaults to `'admin'`. An academy JWT
 *     that hits an unannotated route (e.g. `/properties`) is rejected.
 *  2. Missing `req.user` → defer. JwtAuthGuard short-circuits (returns true
 *     without populating `req.user`) on `@Realm('academy')` routes because
 *     the controller-level `JwtAcademyAuthGuard` owns authentication there.
 *     Enforcing here would reject every academy request before auth runs —
 *     so we pass through and trust the controller guards to reject missing
 *     or wrong-realm tokens. On admin routes, `JwtAuthGuard` already threw
 *     401 before we reach this point, so `!user` is unreachable in practice.
 *
 * `@Public()` routes short-circuit.
 */
@Injectable()
export class RealmGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<AuthRealm | undefined>(
      REALM_KEY,
      [context.getHandler(), context.getClass()],
    );
    const effective: AuthRealm = required ?? 'admin';

    const { user } = context.switchToHttp().getRequest<{
      user?: { realm?: AuthRealm };
    }>();

    // See note (2) above — defer enforcement to controller-level guards when
    // `req.user` isn't populated yet. This is the global-guard case.
    if (!user) return true;

    const actual: AuthRealm = user.realm ?? 'admin';

    if (actual !== effective) {
      throw new ForbiddenException(
        `This endpoint requires a ${effective}-realm token`,
      );
    }
    return true;
  }
}
