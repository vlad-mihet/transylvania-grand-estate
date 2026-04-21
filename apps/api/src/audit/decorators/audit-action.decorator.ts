import { SetMetadata } from '@nestjs/common';

/**
 * Reflector key the AuditInterceptor reads to override URL-based
 * classification for unusual routes (e.g. POST /auth/google/accept-invitation
 * which has no `req.user` but is still a meaningful actor event).
 */
export const AUDIT_ACTION_KEY = 'audit:action';

export interface AuditActionMetadata {
  /** Stable action label, e.g. 'invitation.accept-google'. */
  action: string;
  /** Prisma model name string used for downstream filtering and timelines. */
  resource: string;
  /**
   * Optional — when set, the interceptor anchors the audit row's resourceId
   * to this specific request param (default: 'id'). Useful when a route
   * doesn't expose `:id` directly but does expose another identifier param.
   */
  resourceIdParam?: string;
}

/**
 * Tag a controller method as auditable with an explicit action/resource.
 * The interceptor's URL-based `classify()` is the default; this decorator
 * wins when both apply, so weird routes don't have to grow `classify`.
 *
 *   @Post('google/accept-invitation')
 *   @AuditAction({ action: 'invitation.accept-google', resource: 'Invitation' })
 *   async acceptGoogle(...) { ... }
 */
export const AuditAction = (metadata: AuditActionMetadata) =>
  SetMetadata(AUDIT_ACTION_KEY, metadata);
