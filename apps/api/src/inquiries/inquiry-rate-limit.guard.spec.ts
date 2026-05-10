import {
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { InquiryRateLimitGuard } from './inquiry-rate-limit.guard';

function makeConfig(values: Record<string, string | undefined>): ConfigService {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

/**
 * Pinned because the third-party `@nestjs/throttler` setup silently degraded
 * under burst load (Major #16 in `context/qa-revery-2026-05-09.md`). This
 * guard is the deterministic fallback — its bucket math must hold even
 * when 100 requests hit in the same tick.
 */
describe('InquiryRateLimitGuard', () => {
  function makeContext(headers: Record<string, string> = {}): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers,
          ip: headers['x-forwarded-for']?.split(',')[0]?.trim() ?? '127.0.0.1',
          socket: { remoteAddress: '127.0.0.1' },
        }),
      }),
    } as unknown as ExecutionContext;
  }

  it('allows the first 5 requests from one IP within the window', () => {
    const guard = new InquiryRateLimitGuard();
    const ctx = makeContext({ 'x-forwarded-for': '192.0.2.10' });
    for (let i = 0; i < 5; i++) {
      expect(guard.canActivate(ctx)).toBe(true);
    }
  });

  it('throws 429 on the 6th request from the same IP', () => {
    const guard = new InquiryRateLimitGuard();
    const ctx = makeContext({ 'x-forwarded-for': '192.0.2.11' });
    for (let i = 0; i < 5; i++) guard.canActivate(ctx);
    let thrown: HttpException | undefined;
    try {
      guard.canActivate(ctx);
    } catch (err) {
      thrown = err as HttpException;
    }
    expect(thrown).toBeInstanceOf(HttpException);
    expect(thrown?.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    const body = thrown?.getResponse() as { retryAfterSec?: number };
    expect(body.retryAfterSec).toBeGreaterThan(0);
    expect(body.retryAfterSec).toBeLessThanOrEqual(60);
  });

  it('isolates buckets per IP — flooding one does not impact another', () => {
    const guard = new InquiryRateLimitGuard();
    const flood = makeContext({ 'x-forwarded-for': '192.0.2.20' });
    const innocent = makeContext({ 'x-forwarded-for': '192.0.2.21' });
    for (let i = 0; i < 5; i++) guard.canActivate(flood);
    expect(() => guard.canActivate(flood)).toThrow(HttpException);
    expect(guard.canActivate(innocent)).toBe(true);
  });

  it('keys on the leftmost X-Forwarded-For entry when multiple are chained', () => {
    const guard = new InquiryRateLimitGuard();
    const a = makeContext({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1' });
    const b = makeContext({ 'x-forwarded-for': '203.0.113.5, 10.0.0.2' });
    for (let i = 0; i < 5; i++) guard.canActivate(a);
    expect(() => guard.canActivate(b)).toThrow(HttpException);
  });

  it('falls back to Fly-Client-IP, then req.ip when no XFF is present', () => {
    const guard = new InquiryRateLimitGuard();
    const fly = makeContext({ 'fly-client-ip': '198.51.100.7' });
    for (let i = 0; i < 5; i++) guard.canActivate(fly);
    expect(() => guard.canActivate(fly)).toThrow(HttpException);
  });

  it('expires the bucket after the window so legitimate traffic resumes', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-10T10:00:00Z'));
    const guard = new InquiryRateLimitGuard();
    const ctx = makeContext({ 'x-forwarded-for': '192.0.2.30' });
    for (let i = 0; i < 5; i++) guard.canActivate(ctx);
    expect(() => guard.canActivate(ctx)).toThrow(HttpException);
    jest.setSystemTime(new Date('2026-05-10T10:01:01Z'));
    expect(guard.canActivate(ctx)).toBe(true);
    jest.useRealTimers();
  });

  describe('origin lock', () => {
    it('allows requests with no Origin header (server-to-server / curl)', () => {
      const guard = new InquiryRateLimitGuard(
        makeConfig({ CORS_ORIGINS: 'https://reveria.com' }),
      );
      const ctx = makeContext({ 'x-forwarded-for': '192.0.2.40' });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('allows requests whose Origin matches the CORS allowlist', () => {
      const guard = new InquiryRateLimitGuard(
        makeConfig({
          CORS_ORIGINS: 'https://reveria.com,https://tge.com',
        }),
      );
      const ctx = makeContext({
        'x-forwarded-for': '192.0.2.41',
        origin: 'https://tge.com',
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('rejects requests whose Origin is not in the allowlist', () => {
      const guard = new InquiryRateLimitGuard(
        makeConfig({ CORS_ORIGINS: 'https://reveria.com' }),
      );
      const ctx = makeContext({
        'x-forwarded-for': '192.0.2.42',
        origin: 'https://evil.example',
      });
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('skips origin lock when CORS_ORIGINS is unset (fresh dev)', () => {
      const guard = new InquiryRateLimitGuard(makeConfig({}));
      const ctx = makeContext({
        'x-forwarded-for': '192.0.2.43',
        origin: 'https://anywhere.example',
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });
});
