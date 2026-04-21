import { AdminRole, Prisma } from '@prisma/client';
import type { CurrentUserPayload } from '../common/decorators/user.decorator';
import type { PrismaService } from '../prisma/prisma.service';

/**
 * Role-based read filter applied to every audit query (findAll + byEntity).
 * Returned shape composes with the caller's existing `where` via AND so
 * scope cannot be widened by query params.
 *
 * - SUPER_ADMIN: full firehose.
 * - ADMIN: everything except security-sensitive AdminUser actions
 *   (role changes, password lifecycle, auth.*). Keeps day-to-day admin
 *   debugging useful while reserving security forensics for SUPER_ADMIN.
 * - EDITOR: content-only — Article/Property/Testimonial. Editors should
 *   not be reading agent or auth history.
 * - AGENT: own actions plus mutations on properties they own. The owned-
 *   property list is fetched once per request (PrismaService is request-
 *   bound; cache via the CLS layer at the controller if call sites grow).
 *
 * Async because the AGENT branch needs a property-id list. SUPER_ADMIN /
 * ADMIN / EDITOR resolve synchronously; the await cost there is one
 * microtask and not worth a separate sync entry point.
 */
export async function buildScopeWhere(
  user: CurrentUserPayload,
  prisma: PrismaService,
): Promise<Prisma.AuditLogWhereInput> {
  switch (user.role) {
    case AdminRole.SUPER_ADMIN:
      return {};
    case AdminRole.ADMIN:
      return {
        NOT: {
          OR: [
            {
              resource: 'AdminUser',
              action: {
                in: [
                  'user.role-changed',
                  'user.password-changed',
                  'user.password-reset',
                ],
              },
            },
            { action: { startsWith: 'auth.' } },
          ],
        },
      };
    case AdminRole.EDITOR:
      return { resource: { in: ['Article', 'Property', 'Testimonial'] } };
    case AdminRole.AGENT: {
      const conditions: Prisma.AuditLogWhereInput[] = [{ actorId: user.id }];
      if (user.agentId) {
        const ownedProps = await prisma.property.findMany({
          where: { agentId: user.agentId },
          select: { id: true },
        });
        if (ownedProps.length > 0) {
          conditions.push({
            resource: 'Property',
            resourceId: { in: ownedProps.map((p) => p.id) },
          });
        }
      }
      return { OR: conditions };
    }
    default:
      // New role added without scope mapping → fail closed.
      return { id: '__never__' };
  }
}
