import { PrismaClient } from '@prisma/client';

/**
 * Between-test cleanup. Tables listed in TRUNCATE_ORDER get reset after each
 * test so suites don't cross-contaminate. Ordering matters for FKs; when
 * truncating with CASCADE we don't strictly need it, but the explicit order
 * makes the intent obvious.
 */
const TRUNCATE_ORDER = [
  'password_reset_tokens',
  'oauth_identities',
  'invitations',
  'audit_logs',
  'inquiries',
  'property_images',
  'properties',
  'agents',
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
