#!/usr/bin/env node
// @ts-check
/**
 * Bootstraps a single verified Academy test student with wildcard enrollment
 * (access to every course, current and future). Idempotent — re-running
 * rotates the password hash but keeps the same row + enrollment.
 *
 * Usage:
 *   node --env-file=apps/api/.env scripts/seed-academy-test-user.mjs
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const EMAIL = 'test@academy.local';
const PASSWORD = 'Academy-Test-2026!';
const NAME = 'Test Student';

if (!process.env.DATABASE_URL) {
  console.error(
    'DATABASE_URL is not set. Run with:\n' +
      '  node --env-file=apps/api/.env scripts/seed-academy-test-user.mjs',
  );
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const user = await prisma.academyUser.upsert({
    where: { email: EMAIL },
    create: {
      email: EMAIL,
      name: NAME,
      passwordHash,
      locale: 'ro',
      emailVerifiedAt: new Date(),
    },
    update: {
      passwordHash,
      emailVerifiedAt: new Date(),
    },
  });

  // Wildcard enrollment (courseId NULL) — Postgres treats NULLs as distinct
  // for the @@unique([userId, courseId]) constraint, so we look up first to
  // avoid stacking duplicates on re-runs. grantedById NULL = self-service.
  const existing = await prisma.academyEnrollment.findFirst({
    where: { userId: user.id, courseId: null, revokedAt: null },
  });
  if (!existing) {
    await prisma.academyEnrollment.create({
      data: { userId: user.id, courseId: null, grantedById: null },
    });
  }

  console.log('\nAcademy test user ready:');
  console.log(`  Email:    ${EMAIL}`);
  console.log(`  Password: ${PASSWORD}`);
  console.log('  Locale:   ro  (default landing /ro/login)');
  console.log('  Access:   wildcard (all courses, current + future)');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
