import { z } from 'zod';

/**
 * Startup env validator. Exists so a missing or malformed required variable
 * crashes the process during bootstrap instead of leaking into request
 * handling as a mystery 500 hours later. Run it in `main.ts` before
 * `NestFactory.create`.
 *
 * `NODE_ENV` drives which vars are truly required. Dev mode keeps the list
 * short so a fresh clone boots with `pnpm --filter api dev` + a DB URL.
 */
const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.string().url(),
  // Per-realm signing secrets. Cryptographic separation between admin and
  // academy: a leak of one realm's secret does not let an attacker forge
  // tokens for the other. Realm matching at the strategy layer is now a
  // belt-and-suspenders check on top of signature mismatch.
  JWT_ADMIN_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ADMIN_ACCESS_SECRET must be ≥32 chars'),
  JWT_ADMIN_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_ADMIN_REFRESH_SECRET must be ≥32 chars'),
  JWT_ACADEMY_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACADEMY_ACCESS_SECRET must be ≥32 chars'),
  JWT_ACADEMY_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_ACADEMY_REFRESH_SECRET must be ≥32 chars'),
  JWT_ACCESS_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_EXPIRATION: z.string().default('7d'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  APP_VERSION: z.string().optional(),

  // Invitation + email (optional in dev: EmailService degrades to console.log
  // when RESEND_API_KEY is unset so a fresh clone boots without a Resend
  // account. Prod schema below promotes these to required).
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  // Comma-separated list of admin/sales email addresses that receive a fresh
  // inquiry alert. Optional everywhere — when unset, EmailService still
  // sends the submitter their confirmation but skips the admin notification
  // and logs a warn. Production should set this to ops@<brand>.com.
  INQUIRIES_NOTIFY_TO: z.string().optional(),
  // Svix signing secret for Resend webhooks. Optional in dev; without it the
  // /webhooks/resend endpoint rejects all calls with 503.
  RESEND_WEBHOOK_SECRET: z.string().optional(),
  // Bearer token for protecting /metrics; if unset, the metrics endpoint 404s
  // (feature flag). Keep it out of the same namespace as Resend/OAuth so
  // rotating it doesn't bundle concerns.
  METRICS_BEARER_TOKEN: z.string().optional(),
  // Sentry DSN. Optional everywhere \u2014 when unset, Sentry init is skipped
  // entirely and captureException calls are no-ops. Prod should set it.
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_TRACES_RATE: z.coerce.number().min(0).max(1).optional(),
  ADMIN_PUBLIC_URL: z
    .string()
    .url()
    .default('http://localhost:3051'),
  INVITATION_TOKEN_SECRET: z
    .string()
    .min(32, 'INVITATION_TOKEN_SECRET must be ≥32 chars')
    .optional(),

  // Google OAuth — optional everywhere; when absent the /auth/google
  // endpoints return 501 and the admin UI hides the Google button. This
  // lets the password path ship before the Google Cloud project is set up.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),
  // Academy callback URL distinguishes realm via URL path so an attacker
  // cannot coerce an academy Google callback into an admin session. Same
  // credentials are reused — only the redirect differs.
  GOOGLE_ACADEMY_CALLBACK_URL: z.string().url().optional(),

  // Academy frontend origin + public URL. ORIGIN is consumed by
  // SiteOriginConfig (brand routing via X-Site); PUBLIC_URL is the
  // absolute base used in accept-invite links and the Google callback
  // redirect back to the academy app.
  ACADEMY_ORIGIN: z.string().optional(),
  ACADEMY_PUBLIC_URL: z.string().url().default('http://localhost:3053'),

  // Audit IP pepper. When unset, audit rows store ipHash=null — the audit
  // path keeps writing rows but loses cross-request actor correlation.
  // Required in prod (see productionSchema below).
  AUDIT_IP_PEPPER: z.string().min(16).optional(),

  // Dev escape hatch: bypass ThrottlerGuard globally so a long QA pass
  // doesn't get killed by the 5/min auth bucket. Strictly dev-only — the
  // production schema below rejects the value entirely so it can't ship.
  DEV_AUTH_THROTTLE_DISABLED: z.enum(['0', '1']).optional(),

  // Permanent feature flags. Default unset = feature behaves normally.
  // EMAIL_VERIFICATION_DISABLED=1 makes Academy self-service signup auto-
  // verify the new account and return tokens directly (no inbox round-trip).
  // GOOGLE_AUTH_DISABLED=1 makes /auth/google* and /academy/auth/google*
  // return 501 regardless of whether GOOGLE_CLIENT_ID is configured.
  // Both flags read through FeatureFlagsService — never via ConfigService
  // directly — so the parsing and naming live in one place.
  EMAIL_VERIFICATION_DISABLED: z.enum(['0', '1']).optional(),
  GOOGLE_AUTH_DISABLED: z.enum(['0', '1']).optional(),

  // ── CRM listing sync (REBS) ──────────────────────────────
  // Optional everywhere: the REBS API key is issued manually by the vendor and
  // not yet in hand. When REBS_API_KEY is unset (or REBS_SYNC_ENABLED is not
  // '1') the sync no-ops with a warn — the rest of the API boots normally. A
  // base URL is still useful without the key for pointing local/dev runs at
  // the demo instance (https://demo.crmrebs.com/api/public) or a fixture.
  REBS_API_KEY: z.string().optional(),
  REBS_BASE_URL: z
    .string()
    .url()
    .optional()
    .default('https://client-396fe343.crmrebs.com/api/public'),
  REBS_SYNC_ENABLED: z.enum(['0', '1']).optional(),
  // Reconcile circuit breaker: the sync refuses to soft-unpublish more than
  // this share of a source's live catalog in a single run (a mass drop is an
  // upstream anomaly, not a wave of sales). 0–1; default 0.2 in the
  // orchestrator when unset/invalid.
  CRM_RECONCILE_MAX_UNPUBLISH_RATIO: z.coerce.number().min(0).max(1).optional(),
  // SSRF allowlist for mirrored image hosts (the media mirror downloads URLs
  // straight from the feed). Comma-separated; a host matches if it equals or is
  // a subdomain of an entry. Empty disables the allowlist but the private/
  // link-local/metadata-IP block always applies. Defaults to REBS's domain.
  // TODO(M1): confirm the REAL REBS image host against a live feed response
  // before flipping REBS_SYNC_ENABLED=1. The API is on *.crmrebs.com but image
  // URLs may be served from another host (fixtures use cdn.rebs.ro). If the
  // default doesn't cover the actual CDN, every photo download is rejected by
  // the allowlist and listings import with NO images (only a buried warn).
  CRM_IMAGE_HOST_ALLOWLIST: z.string().optional().default('crmrebs.com'),
});

const productionSchema = baseSchema.extend({
  // CORS must be explicit in prod; permissive defaults have caused real
  // incidents elsewhere.
  CORS_ORIGINS: z.string().min(1, 'CORS_ORIGINS must be set in production'),
  STORAGE_TYPE: z.enum(['r2', 'local']).default('r2'),
  // R2 credentials are required when STORAGE_TYPE=r2.
  R2_ENDPOINT: z.string().url().optional(),
  R2_BUCKET: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),

  // Email vars are soft-required in production: when unset, EmailService
  // degrades to stdout-only and InquiriesService skips the admin alert with
  // a warn. That means real-customer confirmations and lead notifications
  // silently disappear, which is the worst failure mode the contact-flow
  // audit (2026-05-10) identified. We *want* to hard-fail here, but the
  // initial prod-readiness deploy outpaced secret provisioning and the API
  // crashlooped on boot \u2014 so the requirement is currently softened to a
  // boot-time warn (see `softMissing` below). Promote back to `.min(1)` once
  // RESEND_API_KEY / EMAIL_FROM / INQUIRIES_NOTIFY_TO are set on Fly.
  RESEND_WEBHOOK_SECRET: z.string().optional(),
  // Optional but strongly recommended; an unset value silently disables the
  // /metrics scrape endpoint. validateEnv emits a warn-log at boot when
  // missing in production so the operational degradation is visible.
  METRICS_BEARER_TOKEN: z.string().optional(),
  ADMIN_PUBLIC_URL: z
    .string()
    .url('ADMIN_PUBLIC_URL must be a valid URL (e.g. https://admin.tge.ro)'),
  ACADEMY_PUBLIC_URL: z
    .string()
    .url('ACADEMY_PUBLIC_URL must be a valid URL (e.g. https://academy.tge.ro)'),
  INVITATION_TOKEN_SECRET: z
    .string()
    .min(32, 'INVITATION_TOKEN_SECRET must be ≥32 chars in production'),
  // Required in prod so audit ipHash columns are not silently null —
  // forensic correlation across requests is one of the main reasons we
  // ship the audit system at all.
  AUDIT_IP_PEPPER: z
    .string()
    .min(16, 'AUDIT_IP_PEPPER must be ≥16 chars in production'),
});

export type ValidatedEnv = z.infer<typeof baseSchema>;

// Wired into `ConfigModule.forRoot({ validate })` so Zod defaults
// (e.g. ADMIN_PUBLIC_URL, PORT) land in ConfigService — otherwise each
// consumer has to reimplement the default with `??` and the schema's
// `.default(...)` becomes documentation. Also runs the prod R2 cross-check
// that plain schema validation can't express.
export function validateEnv(
  config: Record<string, unknown> = process.env,
): ValidatedEnv {
  const isProd = config.NODE_ENV === 'production';
  const schema = isProd ? productionSchema : baseSchema;
  const parsed = schema.safeParse(config);

  if (!parsed.success) {
    const lines = parsed.error.issues.map(
      (e) => `  - ${e.path.join('.')}: ${e.message}`,
    );
    throw new Error(
      [
        'Environment validation failed:',
        ...lines,
        '',
        'Check .env.production.example for the full list of expected vars.',
      ].join('\n'),
    );
  }

  if (isProd && parsed.data.NODE_ENV === 'production') {
    // Defense in depth — if someone copy-pastes the dev `.env` into prod,
    // refuse to boot rather than silently disable rate limiting on auth.
    if (
      (config.DEV_AUTH_THROTTLE_DISABLED as string | undefined) === '1'
    ) {
      throw new Error(
        'DEV_AUTH_THROTTLE_DISABLED=1 is a dev-only escape hatch and must not be set in production.',
      );
    }
    const d = parsed.data as z.infer<typeof productionSchema>;
    if (d.STORAGE_TYPE === 'r2') {
      const missing = (
        [
          'R2_ENDPOINT',
          'R2_BUCKET',
          'R2_ACCESS_KEY_ID',
          'R2_SECRET_ACCESS_KEY',
          'R2_PUBLIC_URL',
        ] as const
      ).filter((k) => !d[k]);
      if (missing.length > 0) {
        throw new Error(
          `STORAGE_TYPE=r2 requires: ${missing.join(', ')}`,
        );
      }
    }
    // Soft-required vars: not boot-blocking, but ops should know if they're
    // dark in production. The warn lands in stdout where pino-http will pick
    // it up once the logger comes online; before that, console.warn is the
    // only signal channel available.
    const softMissing: string[] = [];
    if (!d.SENTRY_DSN) softMissing.push('SENTRY_DSN');
    if (!d.METRICS_BEARER_TOKEN) softMissing.push('METRICS_BEARER_TOKEN');
    if (softMissing.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `[env] production boot with degraded observability — missing: ${softMissing.join(', ')}. Errors will not reach Sentry / Prometheus until set.`,
      );
    }
    // Contact-flow vars are tracked separately so the warn message names the
    // real customer-facing degradation (vanishing lead emails) rather than
    // burying it inside an "observability" line.
    const contactMissing: string[] = [];
    if (!d.RESEND_API_KEY) contactMissing.push('RESEND_API_KEY');
    if (!d.EMAIL_FROM) contactMissing.push('EMAIL_FROM');
    if (!d.INQUIRIES_NOTIFY_TO) contactMissing.push('INQUIRIES_NOTIFY_TO');
    if (contactMissing.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `[env] production boot with degraded contact flow — missing: ${contactMissing.join(', ')}. Inquiry confirmations and admin lead alerts will be logged to stdout instead of sent.`,
      );
    }
  }

  return parsed.data as ValidatedEnv;
}
