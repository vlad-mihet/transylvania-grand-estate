import { Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import type { Request } from 'express';
import { CLS_REQUEST_CONTEXT, RequestContext } from './request-context';
import { hashIp } from './hash-ip.util';

/**
 * Mounts AsyncLocalStorage on every HTTP request and seeds the audit
 * RequestContext from the request itself.
 *
 * - `userId/email/role/agentId` come from `req.user` (Passport JWT). Public
 *   endpoints leave them null.
 * - `requestId` reuses the same id nestjs-pino genReqId already echoes on
 *   `x-request-id`, so a log line and an audit row pivot together.
 * - `ipHash` is sha256(req.ip + AUDIT_IP_PEPPER); raw IP never leaves the
 *   middleware (see hash-ip.util.ts).
 * - `brand` mirrors `req.site.id`, populated upstream by SiteMiddleware
 *   (see common/site/site.middleware.ts) — falling back to the X-Site
 *   header if SiteMiddleware ran on a path that didn't touch req.site.
 *
 * Service-layer emitters (password reset, Google OAuth) that run before any
 * `req.user` is available can wrap their logic in `cls.run({...}, fn)` to
 * seed actorId explicitly.
 */
@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        setup: (cls, req: Request) => {
          const user = req.user as
            | {
                id?: string;
                email?: string;
                role?: RequestContext['role'];
                agentId?: string | null;
              }
            | undefined;

          const headerRequestId = req.headers['x-request-id'];
          const reqWithId = req as { id?: unknown };
          const requestId =
            (typeof headerRequestId === 'string' && headerRequestId) ||
            (typeof reqWithId.id === 'string' ? reqWithId.id : null);

          const headerSite = req.headers['x-site'];
          const brand =
            req.site?.id ??
            (typeof headerSite === 'string' ? headerSite : null);

          const userAgentHeader = req.headers['user-agent'];
          const userAgent =
            typeof userAgentHeader === 'string'
              ? userAgentHeader.slice(0, 512)
              : null;

          const ctx: RequestContext = {
            userId: user?.id ?? null,
            userEmail: user?.email ?? null,
            role: user?.role ?? null,
            agentId: user?.agentId ?? null,
            requestId: requestId ?? null,
            ipHash: hashIp(req.ip),
            userAgent,
            brand: brand ?? null,
            method: req.method ?? null,
            url: req.originalUrl ?? req.url ?? null,
          };
          cls.set(CLS_REQUEST_CONTEXT, ctx);
        },
      },
    }),
  ],
  exports: [ClsModule],
})
export class RequestContextModule {}
