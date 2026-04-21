import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  OWNS_RESOURCE_KEY,
  type OwnsResourceConfig,
} from '../decorators/owns-resource.decorator';

/**
 * Enforces `@OwnsResource(...)` declared on a handler. Short-circuits for
 * ADMIN and SUPER_ADMIN — they can mutate any row. For AGENT, resolves the
 * target row and asserts the owner field matches the session's agentId (or
 * runs the custom comparator if provided).
 *
 * EDITOR and any unlisted role fall through: they don't have write capability
 * on the protected endpoints anyway, so RolesGuard catches them first. This
 * guard is a second line of defense rather than the primary role gate.
 */
@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const config = this.reflector.getAllAndOverride<OwnsResourceConfig>(
      OWNS_RESOURCE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!config) return true;

    const req = context.switchToHttp().getRequest<{
      user?: { id: string; role: AdminRole; agentId?: string | null };
      params: Record<string, string>;
    }>();

    const user = req.user;
    if (!user) throw new ForbiddenException('Authentication required');

    // ADMIN / SUPER_ADMIN bypass ownership checks — they're allowed on any row.
    if (user.role === AdminRole.ADMIN || user.role === AdminRole.SUPER_ADMIN) {
      return true;
    }

    const id = req.params[config.paramKey ?? 'id'];
    if (!id) throw new ForbiddenException('Ownership guard: missing id param');

    const row = await config.resolve(this.prisma, id);
    if (!row) throw new NotFoundException(`${config.resource} not found`);

    const owner = extractPath(row, config.ownerField);

    if (config.compare) {
      if (!config.compare(owner, { id: user.id, agentId: user.agentId ?? null })) {
        throw new ForbiddenException('You do not own this resource');
      }
      return true;
    }

    if (!user.agentId || owner !== user.agentId) {
      throw new ForbiddenException('You do not own this resource');
    }
    return true;
  }
}

function extractPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}
