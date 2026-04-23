import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { REALM_KEY } from '../decorators/realm.decorator';
import type { AuthRealm } from '../auth/realm';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const realm = this.reflector.getAllAndOverride<AuthRealm | undefined>(
      REALM_KEY,
      [context.getHandler(), context.getClass()],
    );
    // Academy realm routes don't use the AdminRole enum; their own
    // authorization is enforced by EnrolledGuard and service-level checks.
    if (realm === 'academy') return true;

    const requiredRoles = this.reflector.getAllAndOverride<AdminRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) return true;
    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: { role?: AdminRole } }>();
    if (!user?.role) return false;
    return requiredRoles.includes(user.role);
  }
}
