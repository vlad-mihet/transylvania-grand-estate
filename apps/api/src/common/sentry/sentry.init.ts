import * as Sentry from '@sentry/node';

/**
 * Bootstrap Sentry if a DSN is configured. No-op otherwise \u2014 contributors
 * can run the API without setting up Sentry, and prod can defer enabling it
 * until a team / DSN is provisioned. Call this very early in main.ts (before
 * NestFactory.create) so unhandled errors during bootstrap also get captured.
 *
 * We deliberately skip `@sentry/nestjs` wrapper \u2014 the default global
 * exception filter + process-level handlers catch the same errors and the
 * wrapper adds opinionated request-span shaping we don't need yet.
 */
export function initSentry(): boolean {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.APP_VERSION,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_RATE ?? 0.1),
    // Scrub fields that must never leave our infra. Sentry's defaults
    // already strip passwords + auth headers, but the belt-and-suspenders
    // list here is explicit for the custom fields in our payloads.
    beforeSend(event) {
      if (event.request?.headers) {
        const h = event.request.headers as Record<string, string>;
        delete h.authorization;
        delete h.cookie;
        delete h['x-site'];
      }
      // Scrub PII keys from request body (Sentry auto-captures req.body on
      // some integrations). The contact-flow audit (2026-05-10) made this
      // explicit because POST /inquiries bodies contain name/email/phone/
      // message in cleartext and a misconfigured Sentry breadcrumb would
      // ship them straight off-prem.
      if (event.request?.data && typeof event.request.data === 'object') {
        const body = event.request.data as Record<string, unknown>;
        for (const piiKey of [
          'name',
          'email',
          'phone',
          'message',
          'firstName',
          'lastName',
          'password',
          'currentPassword',
          'newPassword',
        ]) {
          if (piiKey in body) body[piiKey] = '[REDACTED]';
        }
      }
      return event;
    },
    beforeSendTransaction(event) {
      // Drop health probes from traces \u2014 Fly hits /health/live every few
      // seconds and they're useless in a transaction graph.
      if (event.transaction?.startsWith('GET /api/v1/health')) return null;
      return event;
    },
  });

  return true;
}

export { Sentry };
