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
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be ≥32 chars'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be ≥32 chars'),
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

  // Audit IP pepper. When unset, audit rows store ipHash=null — the audit
  // path keeps writing rows but loses cross-request actor correlation.
  // Required in prod (see productionSchema below).
  AUDIT_IP_PEPPER: z.string().min(16).optional(),
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

  // Email: optional in prod while Resend is not yet provisioned. EmailService
  // degrades to stdout logging when RESEND_API_KEY is unset (same behavior as
  // dev), so the API boots and non-email features work. Before inviting real
  // users via the agent-invitations flow, these must be set — otherwise the
  // acceptance URL only reaches the Fly logs.
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  // Optional in prod too \u2014 if unset, the webhook endpoint rejects all
  // traffic so we fail closed. Operators should set it after provisioning
  // a Resend webhook.
  RESEND_WEBHOOK_SECRET: z.string().optional(),
  METRICS_BEARER_TOKEN: z.string().optional(),
  ADMIN_PUBLIC_URL: z
    .string()
    .url('ADMIN_PUBLIC_URL must be a valid URL (e.g. https://admin.tge.ro)'),
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
  }

  return parsed.data as ValidatedEnv;
}
