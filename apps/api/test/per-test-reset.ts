import { PrismaClient } from '@prisma/client';

/**
 * Between-test cleanup. Tables listed in TRUNCATE_ORDER get reset after each
 * test so suites don't cross-contaminate. Ordering matters for FKs; when
 * truncating with CASCADE we don't strictly need it, but the explicit order
 * makes the intent obvious.
 *
 * Each e2e spec opts in via `import './per-test-reset';` at the top. Importing
 * for side effects is the reliable way to register Jest hooks — the older
 * `setupFilesAfterEach` config key isn't a real Jest option, and `setupFiles`
 * runs before the framework globals exist, so `afterEach` is undefined there.
 */
const TRUNCATE_ORDER = [
  'password_reset_tokens',
  'oauth_identities',
  'revoked_tokens',
  'invitations',
  'audit_logs',
  'inquiries',
  'property_images',
  'properties',
  'agents',
  'developers',
  // Academy tables — most-dependent first. CASCADE handles FK ordering
  // within this block, but the explicit sequence documents intent.
  'academy_revoked_tokens',
  'academy_password_reset_tokens',
  'academy_user_identities',
  'academy_enrollments',
  'academy_invitations',
  'lessons',
  'courses',
  'academy_users',
  'admin_users',
];

let client: PrismaClient | null = null;

afterEach(async () => {
  if (!client) {
    client = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
  }
  const list = TRUNCATE_ORDER.map((t) => `"${t}"`).join(', ');
  await client.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`);
});

afterAll(async () => {
  await client?.$disconnect();
});
