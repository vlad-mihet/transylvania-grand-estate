import type { AdminRole } from '@prisma/client';

/**
 * Per-request execution-scoped state carried by AsyncLocalStorage (nestjs-cls).
 * Populated by ClsModule middleware on every HTTP request and read by the
 * AuditInterceptor + AuditService.recordCustom — so service-level emitters
 * (password reset, OAuth, future cron jobs) get the same forensics columns
 * as interceptor-captured rows without re-plumbing every call site.
 *
 * Every field is optional: background jobs that opt into CLS via `cls.run`
 * are free to set only the subset they know.
 */
export interface RequestContext {
  userId?: string | null;
  userEmail?: string | null;
  role?: AdminRole | null;
  agentId?: string | null;
  requestId?: string | null;
  /** sha256(rawIp + AUDIT_IP_PEPPER). Raw IP is never stored. */
  ipHash?: string | null;
  userAgent?: string | null;
  brand?: string | null;
  method?: string | null;
  url?: string | null;
}

/** Single CLS namespace key — keep all consumers reading the same string. */
export const CLS_REQUEST_CONTEXT = 'requestContext';
