import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from, tap } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ClsService } from 'nestjs-cls';
import { AuditService } from '../../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AUDIT_ACTION_KEY,
  AuditActionMetadata,
} from '../../audit/decorators/audit-action.decorator';
import {
  CLS_REQUEST_CONTEXT,
  RequestContext,
} from '../cls/request-context';

interface AuditMetadata {
  resource: string;
  action: string;
  resourceIdParam?: string;
}

/**
 * Global interceptor that writes an `audit_logs` row after every successful
 * mutating request on an allow-listed resource, OR a method explicitly
 * tagged with `@AuditAction(...)`.
 *
 * Coverage rules:
 *   - HTTP method is POST / PATCH / DELETE.
 *   - The route is either matched by `classify()` (URL-based allowlist) or
 *     decorated with `@AuditAction(...)` (Reflector-based override). The
 *     decorator wins when both apply.
 *   - `before` snapshot is captured for PATCH/DELETE by reading the row
 *     from Prisma immediately before the handler runs. Some POSTs also
 *     snapshot when the resource is a singleton being mutated (SiteConfig).
 *   - `after` snapshot is the handler's response (minus the Transform
 *     envelope). DELETE responses are treated as null.
 *
 * The interceptor also pushes `req.user` into the CLS context once it
 * exists — ClsModule's middleware runs before guards, so `req.user` is
 * still undefined when CLS first mounts. Updating the context here means
 * recordCustom() calls from inside services (during the same HTTP request)
 * see the actor attributed correctly.
 *
 * Failures of both the read-before and the audit write itself are swallowed
 * — a hiccup in the audit path can't break the real request. The failure
 * counter in AuditHealthService surfaces them on the admin dashboard.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private auditService: AuditService,
    private prisma: PrismaService,
    private reflector: Reflector,
    private cls: ClsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{
      method: string;
      url: string;
      originalUrl?: string;
      route?: { path?: string };
      params: Record<string, string>;
      user?: {
        id: string;
        email?: string;
        role?: RequestContext['role'];
        agentId?: string | null;
      };
    }>();

    // Push req.user into the CLS context so service-level recordCustom
    // calls fired during this request know who the actor is. ClsModule
    // middleware runs before guards, so this is the first opportunity to
    // see req.user — gracefully no-ops if CLS isn't mounted (tests).
    this.enrichClsActor(req);

    const method = req.method?.toUpperCase();
    if (method !== 'POST' && method !== 'PATCH' && method !== 'DELETE') {
      return next.handle();
    }

    const decoratorMeta =
      this.reflector.getAllAndOverride<AuditActionMetadata | undefined>(
        AUDIT_ACTION_KEY,
        [context.getHandler(), context.getClass()],
      );
    const meta: AuditMetadata | null = decoratorMeta
      ? {
          resource: decoratorMeta.resource,
          action: decoratorMeta.action,
          resourceIdParam: decoratorMeta.resourceIdParam,
        }
      : this.classify(req.url ?? req.originalUrl ?? '', method, req.params);
    if (!meta) return next.handle();

    const actorId = req.user?.id ?? null;
    const idParam = meta.resourceIdParam ?? 'id';
    const paramId = req.params?.[idParam];

    // Read-before for PATCH/DELETE. POST has nothing to snapshot — except
    // for resources where "POST" is actually a mutation of a singleton
    // (e.g. SiteConfig.tge-county-scope add/remove) and the `before` of
    // the singleton is what audit reviewers want to see the diff against.
    const needsBefore =
      method === 'PATCH' ||
      method === 'DELETE' ||
      meta.resource === 'SiteConfig';
    const beforePromise: Promise<unknown | null> = needsBefore
      ? this.readBefore(meta.resource, paramId ?? 'singleton').catch(() => null)
      : Promise.resolve(null);

    return from(beforePromise).pipe(
      switchMap((before) =>
        next.handle().pipe(
          tap((result) => {
            const after = method === 'DELETE' ? null : unwrap(result);
            const isSelfAuth =
              meta.resource === 'AdminUser' &&
              (meta.action === 'user.password-changed' ||
                meta.action === 'user.logout');
            const isSingletonSiteConfig = meta.resource === 'SiteConfig';
            const resourceId =
              paramId ??
              extractId(after) ??
              extractId(unwrap(result)) ??
              (isSelfAuth ? actorId ?? undefined : undefined) ??
              (isSingletonSiteConfig ? 'singleton' : undefined);
            if (!resourceId) return;
            void this.auditService.record({
              actorId,
              action: meta.action,
              resource: meta.resource,
              resourceId,
              before: sanitize(before),
              after: sanitize(after),
            });
          }),
        ),
      ),
    );
  }

  private enrichClsActor(req: {
    user?: {
      id: string;
      email?: string;
      role?: RequestContext['role'];
      agentId?: string | null;
    };
  }): void {
    if (!req.user) return;
    let ctx: RequestContext | undefined;
    try {
      ctx = this.cls.get<RequestContext>(CLS_REQUEST_CONTEXT);
    } catch {
      return;
    }
    if (!ctx) return;
    if (ctx.userId) return; // already enriched by an earlier interceptor pass
    this.cls.set(CLS_REQUEST_CONTEXT, {
      ...ctx,
      userId: req.user.id,
      userEmail: req.user.email ?? null,
      role: req.user.role ?? null,
      agentId: req.user.agentId ?? null,
    });
  }

  /**
   * Resource → Prisma delegate. Kept narrow on purpose — adding a new
   * auditable resource is one `case` away.
   */
  private async readBefore(
    resource: string,
    id: string,
  ): Promise<unknown | null> {
    switch (resource) {
      case 'Property':
        return this.prisma.property.findUnique({ where: { id } });
      case 'Inquiry':
        return this.prisma.inquiry.findUnique({ where: { id } });
      case 'Article':
        return this.prisma.article.findUnique({ where: { id } });
      case 'Agent':
        return this.prisma.agent.findUnique({ where: { id } });
      case 'City':
        return this.prisma.city.findUnique({ where: { id } });
      case 'County':
        return this.prisma.county.findUnique({ where: { id } });
      case 'Neighborhood':
        return this.prisma.neighborhood.findUnique({ where: { id } });
      case 'Developer':
        return this.prisma.developer.findUnique({ where: { id } });
      case 'Testimonial':
        return this.prisma.testimonial.findUnique({ where: { id } });
      case 'BankRate':
        return this.prisma.bankRate.findUnique({ where: { id } });
      case 'FinancialIndicator':
        return this.prisma.financialIndicator.findUnique({
          where: { key: id },
        });
      case 'AdminUser':
        // Explicit select — never snapshot the password hash.
        return this.prisma.adminUser.findUnique({
          where: { id },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        });
      case 'Invitation':
        // tokenHash is sensitive (pre-image of the email link); omit from
        // audit diff — the resourceId + status changes are enough for
        // "who resent/revoked this invitation" forensics.
        return this.prisma.invitation.findUnique({
          where: { id },
          select: {
            id: true,
            email: true,
            role: true,
            agentId: true,
            status: true,
            expiresAt: true,
            acceptedAt: true,
            acceptedVia: true,
            emailSentAt: true,
            invitedById: true,
            createdAt: true,
            updatedAt: true,
          },
        });
      case 'SiteConfig':
        // Singleton row — id is always 'singleton'. Brand-scope changes
        // (tgeCountyScope array) are the headline reason to audit this
        // resource, so capture the full row to diff cleanly.
        return this.prisma.siteConfig.findUnique({
          where: { id: 'singleton' },
        });
      default:
        return null;
    }
  }

  private classify(
    rawUrl: string,
    method: string,
    params: Record<string, string>,
  ): AuditMetadata | null {
    const [path] = rawUrl.split('?');
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) return null;

    const [head, second, third] = segments;

    if (head === 'auth') {
      if (second === 'users') {
        return {
          resource: 'AdminUser',
          action: `user.${verbFor(method)}`,
        };
      }
      if (method === 'POST' && second === 'change-password') {
        return { resource: 'AdminUser', action: 'user.password-changed' };
      }
      if (method === 'POST' && second === 'logout') {
        return { resource: 'AdminUser', action: 'user.logout' };
      }
      // Public endpoints (login, forgot-password, reset-password, oauth
      // callback) have no authenticated actor at request time. Services
      // emit their own audit rows in those flows via recordCustom().
      return null;
    }

    switch (head) {
      case 'properties':
        // Nested image sub-routes anchor on the parent property id so
        // entries land in the property's history tab. Without this,
        // params.id would be the IMAGE id and the row would point at a
        // dead reference once the image is deleted.
        if (third === 'images') {
          return {
            resource: 'Property',
            action: `property.image.${verbFor(method)}`,
            // params.id is still the parent property id here — the nested
            // image id lives in params.imageId.
            resourceIdParam: 'id',
          };
        }
        return {
          resource: 'Property',
          action: `property.${verbFor(method)}`,
        };
      case 'inquiries':
        return {
          resource: 'Inquiry',
          action:
            method === 'PATCH' && segments[2] === 'status'
              ? 'inquiry.status-change'
              : `inquiry.${verbFor(method)}`,
        };
      case 'articles':
        return {
          resource: 'Article',
          action: `article.${verbFor(method)}`,
        };
      case 'agents': {
        if (third === 'photo') {
          return {
            resource: 'Agent',
            action: `agent.photo.${verbFor(method)}`,
          };
        }
        return { resource: 'Agent', action: `agent.${verbFor(method)}` };
      }
      case 'cities': {
        if (third === 'image') {
          return {
            resource: 'City',
            action: `city.image.${verbFor(method)}`,
          };
        }
        return { resource: 'City', action: `city.${verbFor(method)}` };
      }
      case 'counties':
        return { resource: 'County', action: `county.${verbFor(method)}` };
      case 'neighborhoods':
        return {
          resource: 'Neighborhood',
          action: `neighborhood.${verbFor(method)}`,
        };
      case 'developers': {
        if (third === 'logo') {
          return {
            resource: 'Developer',
            action: `developer.logo.${verbFor(method)}`,
          };
        }
        return {
          resource: 'Developer',
          action: `developer.${verbFor(method)}`,
        };
      }
      case 'testimonials':
        return {
          resource: 'Testimonial',
          action: `testimonial.${verbFor(method)}`,
        };
      case 'financial-data': {
        // /financial-data/bank-rates(/:id) → BankRate
        // /financial-data/indicators/:key → FinancialIndicator
        // /financial-data/sync-bnr → admin op, no resource row, skip
        if (second === 'bank-rates') {
          return {
            resource: 'BankRate',
            action: `bank-rate.${verbFor(method)}`,
          };
        }
        if (second === 'indicators') {
          // params.key is the resourceId for indicator updates.
          if (params?.key) {
            return {
              resource: 'FinancialIndicator',
              action: `financial-indicator.${verbFor(method)}`,
              resourceIdParam: 'key',
            };
          }
        }
        if (second === 'sync-bnr') {
          // Bulk sync touches every indicator row; auditing a single row id
          // would be misleading. Service emits a `recordCustom` instead with
          // the per-indicator changes, so the interceptor stays out of it.
          return null;
        }
        return null;
      }
      case 'invitations': {
        const fourth = segments[3];
        let action: string;
        if (second === 'agents' && fourth === 'invite') {
          action = 'invitation.invite-existing';
        } else if (second === 'agents') {
          action = 'invitation.create';
        } else if (third === 'resend') action = 'invitation.resend';
        else if (third === 'revoke') action = 'invitation.revoke';
        else if (second === 'accept') action = 'invitation.accept-password';
        else action = `invitation.${verbFor(method)}`;
        return { resource: 'Invitation', action };
      }
      case 'site-config': {
        if (second === 'tge-county-scope') {
          if (method === 'POST')
            return { resource: 'SiteConfig', action: 'site-config.tge-scope.add' };
          if (method === 'DELETE')
            return {
              resource: 'SiteConfig',
              action: 'site-config.tge-scope.remove',
            };
        }
        if (method === 'PATCH')
          return { resource: 'SiteConfig', action: 'site-config.update' };
        return null;
      }
      default:
        return null;
    }
  }
}

function verbFor(method: string): string {
  switch (method) {
    case 'POST':
      return 'create';
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    default:
      return method.toLowerCase();
  }
}

function extractId(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const id = (value as { id?: unknown }).id;
  return typeof id === 'string' ? id : undefined;
}

/**
 * Peel the TransformInterceptor envelope (`{ success, data, meta? }`) so
 * `after` is always the raw row shape the service returned. Interceptor
 * pipelines are order-dependent; this keeps the shape stable regardless of
 * whether Audit runs inside or outside Transform.
 */
function unwrap(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  const obj = value as Record<string, unknown>;
  if (obj.success === true && 'data' in obj) return obj.data;
  return value;
}

/**
 * Strip fields that must never reach the audit log. Currently only the
 * admin user's password hash — Prisma's default `findUnique` on AdminUser
 * returns it unless selected-out, and the `readBefore` path uses an
 * explicit select, but this is a belt-and-suspenders guard for future
 * Prisma defaults. The diff util applies a wider regex (password|secret|
 * token|hash) to its output for the same reason.
 */
function sanitize(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value;
  const obj = { ...(value as Record<string, unknown>) };
  if ('passwordHash' in obj) delete obj.passwordHash;
  return obj;
}
