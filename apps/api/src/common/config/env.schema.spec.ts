import { validateEnv } from './env.schema';

/**
 * Pins the production env contract. The contact-flow audit (2026-05-10)
 * originally promoted RESEND_API_KEY, EMAIL_FROM, and INQUIRIES_NOTIFY_TO
 * to hard boot-time requirements, but the first prod deploy outpaced
 * secret provisioning and crashlooped the API. They are now soft-required:
 * the API still boots, but emits a clearly-named boot-time warn so ops
 * notices the customer-facing degradation. Promote back to `.min(1)` once
 * the secrets are set on Fly.
 */
describe('validateEnv', () => {
  // Minimal valid prod env. Each test mutates a copy.
  const validProdEnv = (): Record<string, string | undefined> => ({
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://u:p@host:5432/db',
    JWT_ADMIN_ACCESS_SECRET: 'a'.repeat(64),
    JWT_ADMIN_REFRESH_SECRET: 'b'.repeat(64),
    JWT_ACADEMY_ACCESS_SECRET: 'c'.repeat(64),
    JWT_ACADEMY_REFRESH_SECRET: 'd'.repeat(64),
    INVITATION_TOKEN_SECRET: 'e'.repeat(64),
    AUDIT_IP_PEPPER: 'f'.repeat(32),
    CORS_ORIGINS: 'https://tge.com,https://reveria.com',
    ADMIN_PUBLIC_URL: 'https://admin.tge.com',
    ACADEMY_PUBLIC_URL: 'https://academy.tge.com',
    STORAGE_TYPE: 'local',
    SENTRY_DSN: 'https://abc@sentry.io/1',
    METRICS_BEARER_TOKEN: 'metrics-token',
    RESEND_API_KEY: 're_realkey',
    EMAIL_FROM: 'TGE <no-reply@tge.com>',
    INQUIRIES_NOTIFY_TO: 'ops@tge.com',
  });

  it('boots with the minimal valid prod env', () => {
    const env = validProdEnv();
    expect(() => validateEnv(env)).not.toThrow();
  });

  it.each([
    ['RESEND_API_KEY'],
    ['EMAIL_FROM'],
    ['INQUIRIES_NOTIFY_TO'],
  ])(
    'boots (does not throw) when %s is unset in production and warns about contact-flow degradation',
    (key) => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const env = validProdEnv();
      delete env[key];
      expect(() => validateEnv(env)).not.toThrow();
      const messages = warn.mock.calls.map((c) => c[0] as string);
      const contactWarn = messages.find((m) =>
        m.includes('degraded contact flow'),
      );
      expect(contactWarn).toBeDefined();
      expect(contactWarn).toContain(key);
      warn.mockRestore();
    },
  );

  it('hard-fails when DEV_AUTH_THROTTLE_DISABLED=1 sneaks into production', () => {
    const env = { ...validProdEnv(), DEV_AUTH_THROTTLE_DISABLED: '1' };
    expect(() => validateEnv(env)).toThrow(
      /DEV_AUTH_THROTTLE_DISABLED=1 is a dev-only/,
    );
  });

  it('warns (does not throw) when SENTRY_DSN + METRICS_BEARER_TOKEN are unset in prod', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const env = validProdEnv();
    delete env.SENTRY_DSN;
    delete env.METRICS_BEARER_TOKEN;
    expect(() => validateEnv(env)).not.toThrow();
    const messages = warn.mock.calls.map((c) => c[0] as string);
    const obsWarn = messages.find((m) => m.includes('degraded observability'));
    expect(obsWarn).toBeDefined();
    expect(obsWarn).toContain('SENTRY_DSN');
    expect(obsWarn).toContain('METRICS_BEARER_TOKEN');
    warn.mockRestore();
  });

  it('lets dev / test boot without Resend or notify-to set (regression check)', () => {
    const env = {
      NODE_ENV: 'development',
      DATABASE_URL: 'postgresql://u:p@host:5432/db',
      JWT_ADMIN_ACCESS_SECRET: 'a'.repeat(64),
      JWT_ADMIN_REFRESH_SECRET: 'b'.repeat(64),
      JWT_ACADEMY_ACCESS_SECRET: 'c'.repeat(64),
      JWT_ACADEMY_REFRESH_SECRET: 'd'.repeat(64),
    };
    expect(() => validateEnv(env)).not.toThrow();
  });
});
