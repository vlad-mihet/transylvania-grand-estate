import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'node:child_process';
import * as path from 'node:path';

/**
 * Boots a Postgres container once per Jest run and runs `prisma migrate
 * deploy` against it. The DATABASE_URL is stashed on a sentinel env var so
 * per-suite code can read it; the container reference is attached to
 * globalThis so globalTeardown can stop it.
 *
 * Dependencies: a running Docker daemon. CI runners typically provide one;
 * local dev needs Docker Desktop or Colima. If you hit
 * "Docker not available" here, start Docker and retry \u2014 no workaround
 * keeps this hermetic.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare global {
  // eslint-disable-next-line no-var
  var __PG_CONTAINER__: StartedPostgreSqlContainer | undefined;
}

export default async function globalSetup(): Promise<void> {
  const container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('tge_test')
    .withUsername('tge_test')
    .withPassword('tge_test')
    .start();

  const url = container.getConnectionUri();
  process.env.DATABASE_URL = url;
  process.env.NODE_ENV = 'test';
  // Minimum-viable env values so env validation passes and auth services
  // can sign/verify JWTs during tests. Per-realm secrets must differ so
  // realm-leakage tests can confirm signature mismatch.
  process.env.JWT_ADMIN_ACCESS_SECRET =
    process.env.JWT_ADMIN_ACCESS_SECRET ??
    'test_admin_access_secret_ge_32_xxxxxxx';
  process.env.JWT_ADMIN_REFRESH_SECRET =
    process.env.JWT_ADMIN_REFRESH_SECRET ??
    'test_admin_refresh_secret_ge_32_xxxxxx';
  process.env.JWT_ACADEMY_ACCESS_SECRET =
    process.env.JWT_ACADEMY_ACCESS_SECRET ??
    'test_academy_access_secret_ge_32_xxxxx';
  process.env.JWT_ACADEMY_REFRESH_SECRET =
    process.env.JWT_ACADEMY_REFRESH_SECRET ??
    'test_academy_refresh_secret_ge_32_xxxx';
  process.env.INVITATION_TOKEN_SECRET =
    process.env.INVITATION_TOKEN_SECRET ??
    'test_invitation_secret_ge_32_chars_xxxxxxx';
  process.env.ADMIN_PUBLIC_URL =
    process.env.ADMIN_PUBLIC_URL ?? 'http://admin.test';

  // Sync schema to the test container. Using `db push` instead of `migrate
  // deploy` because some committed seed migrations (e.g.
  // `20260505003000_seed_revery_romania_cities`) assert the existence of
  // pre-seeded counties and abort against an empty container. `db push`
  // syncs the schema without running migration history — tests that need
  // specific data seed it themselves.
  //
  // Phase 2 — Stage 2.0a tried switching to `migrate deploy` so every
  // spec exercises the real migration sequence. That work-item is
  // gated on making the Revery-cities seed migration idempotent (or
  // splitting it from the schema chain). Reverted for now.
  const apiDir = path.resolve(__dirname, '..');
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    cwd: apiDir,
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });

  globalThis.__PG_CONTAINER__ = container;
}
