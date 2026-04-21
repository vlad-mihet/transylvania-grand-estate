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
  // can sign/verify JWTs during tests.
  process.env.JWT_ACCESS_SECRET =
    process.env.JWT_ACCESS_SECRET ?? 'test_access_secret_ge_32_chars_xxxxxxxxx';
  process.env.JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET ?? 'test_refresh_secret_ge_32_chars_xxxxxxxx';
  process.env.INVITATION_TOKEN_SECRET =
    process.env.INVITATION_TOKEN_SECRET ??
    'test_invitation_secret_ge_32_chars_xxxxxxx';
  process.env.ADMIN_PUBLIC_URL =
    process.env.ADMIN_PUBLIC_URL ?? 'http://admin.test';

  // Run Prisma migrations against the test container. Using `migrate deploy`
  // because the migration folder is committed; `migrate dev` would mutate
  // the developer's workstation schema outside the container.
  const apiDir = path.resolve(__dirname, '..');
  execSync('npx prisma migrate deploy', {
    cwd: apiDir,
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });

  globalThis.__PG_CONTAINER__ = container;
}
