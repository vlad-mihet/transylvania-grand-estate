import { validateEnv } from './env.schema';

/**
 * Pins the production env contract. The contact-flow audit (2026-05-10)
 * promoted RESEND_API_KEY, EMAIL_FROM, and INQUIRIES_NOTIFY_TO from
 * "optional, silent stdout fallback" to hard boot-time requirements —
 * regressing any of them would re-introduce the silent-failure mode where
 * customer confirmations and admin lead alerts vanish.
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
  ])('hard-fails when %s is unset in production', (key) => {
    const env = validProdEnv();
    delete env[key];
    expect(() => validateEnv(env)).toThrow(
      new RegExp(`Environment validation failed[\\s\\S]*${key}`),
    );
  });

  it.each([
    ['RESEND_API_KEY', 'RESEND_API_KEY required in production'],
    ['EMAIL_FROM', 'EMAIL_FROM required in production'],
    ['INQUIRIES_NOTIFY_TO', 'INQUIRIES_NOTIFY_TO required in production'],
  ])(
    'hard-fails with the helpful custom message when %s is set to empty string in production',
    (key, expectedSnippet) => {
      const env = { ...validProdEnv(), [key]: '' };
      expect(() => validateEnv(env)).toThrow(new RegExp(expectedSnippet));
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
    expect(warn).toHaveBeenCalledTimes(1);
    const message = warn.mock.calls[0]?.[0];
    expect(message).toMatch(/degraded observability/);
    expect(message).toMatch(/SENTRY_DSN/);
    expect(message).toMatch(/METRICS_BEARER_TOKEN/);
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
