import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { MetricsService } from '../metrics/metrics.service';
import { Sentry } from '../common/sentry/sentry.init';

interface Bucket {
  hits: number;
  resetAt: number;
}

/**
 * Belt-and-suspenders rate limiter for `POST /inquiries`. The global
 * `@nestjs/throttler` setup silently degrades under some conditions (see
 * Major #16 in `context/qa-revery-2026-05-09.md` — burst of 15 returned 201
 * each despite a 5/min decorator). The inquiry endpoint is the most spam-
 * prone surface in the API, so we keep the @Throttle decorator AND apply
 * this guard as a redundant deterministic check.
 *
 * Single-instance only. Production with multiple Fly replicas gets one
 * bucket per instance — fine as defense-in-depth alongside the B-5 honeypot
 * planned in `plans/i-need-you-to-wondrous-ullman.md`. Move to a Redis-
 * backed store when scale demands cluster-wide enforcement.
 */
@Injectable()
export class InquiryRateLimitGuard implements CanActivate {
  private static readonly LIMIT = 5;
  private static readonly WINDOW_MS = 60_000;
  // Hard cap on bucket count so a flood of unique IPs cannot bloat memory.
  private static readonly MAX_BUCKETS = 5_000;

  private readonly logger = new Logger(InquiryRateLimitGuard.name);
  private readonly buckets = new Map<string, Bucket>();
  private nextSweepAt = Date.now() + InquiryRateLimitGuard.WINDOW_MS;
  private allowedOrigins: ReadonlySet<string> | null = null;

  // ConfigService + MetricsService are optional so the unit-test
  // instantiation `new InquiryRateLimitGuard()` keeps working without DI
  // plumbing — origin lock simply skips when no config is wired, and the
  // metrics counters silently no-op. NestJS's @Optional() picks up both
  // when the guard is mounted via DI.
  constructor(
    @Optional() private readonly config?: ConfigService,
    @Optional() private readonly metrics?: MetricsService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    this.enforceOriginLock(req);

    const ip = this.extractClientIp(req);
    const now = Date.now();

    this.maybeSweep(now);

    const bucket = this.buckets.get(ip);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(ip, {
        hits: 1,
        resetAt: now + InquiryRateLimitGuard.WINDOW_MS,
      });
      return true;
    }

    bucket.hits += 1;

    if (bucket.hits > InquiryRateLimitGuard.LIMIT) {
      const retryAfterSec = Math.max(
        1,
        Math.ceil((bucket.resetAt - now) / 1000),
      );
      this.metrics?.inquiriesThrottled.inc();
      Sentry.addBreadcrumb({
        category: 'inquiry.security',
        level: 'warning',
        message: 'rate-limit.exceeded',
        data: { retryAfterSec, hits: bucket.hits },
      });
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message:
            'Too many inquiry submissions from your network. Please wait a minute before trying again.',
          retryAfterSec,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * Soft origin lock. CORS already gates browser traffic, but a scripted POST
   * with a forged Origin header bypasses the browser's CORS check. We layer a
   * server-side allowlist on top: a request that DOES set Origin must match
   * `CORS_ORIGINS`. Server-to-server traffic without an Origin header is left
   * alone — the rate limiter + honeypot still catch abuse there. This is
   * defense in depth, not a primary boundary.
   */
  private enforceOriginLock(req: Request): void {
    const origin = req.headers.origin;
    if (typeof origin !== 'string' || origin.length === 0) {
      // No Origin header — server-to-server, mobile native, or curl. The
      // rate limiter and honeypot remain the controls; we don't 403 here.
      return;
    }

    const allowlist = this.getAllowedOrigins();
    if (allowlist === null) {
      // Config unwired (unit test, fresh dev .env). Skip the check rather
      // than reject every request and break the inquiry endpoint.
      return;
    }

    if (!allowlist.has(origin)) {
      this.logger.warn({
        event: 'inquiry.origin_blocked',
        origin,
        path: req.url,
      });
      this.metrics?.inquiriesOriginBlocked.inc();
      Sentry.addBreadcrumb({
        category: 'inquiry.security',
        level: 'warning',
        message: 'origin.blocked',
        data: { origin },
      });
      throw new ForbiddenException('Origin not allowed for this endpoint.');
    }
  }

  private getAllowedOrigins(): ReadonlySet<string> | null {
    if (this.allowedOrigins !== null) return this.allowedOrigins;
    if (!this.config) return null;
    const raw = this.config.get<string>('CORS_ORIGINS');
    if (!raw) return null;
    const parsed = new Set(
      raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    );
    this.allowedOrigins = parsed;
    return parsed;
  }

  private extractClientIp(req: Request): string {
    const xff = req.headers['x-forwarded-for'];
    if (typeof xff === 'string' && xff.length > 0) {
      return xff.split(',')[0].trim();
    }
    if (Array.isArray(xff) && xff.length > 0) {
      return xff[0];
    }
    const fly = req.headers['fly-client-ip'];
    if (typeof fly === 'string' && fly.length > 0) return fly;
    return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
  }

  private maybeSweep(now: number): void {
    if (
      now < this.nextSweepAt &&
      this.buckets.size < InquiryRateLimitGuard.MAX_BUCKETS
    ) {
      return;
    }
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
    this.nextSweepAt = now + InquiryRateLimitGuard.WINDOW_MS;
  }
}
