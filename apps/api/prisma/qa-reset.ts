/**
 * Dev-only QA fixture: resets the four admin/manager/editor/agent users to a
 * known password and ensures one user exists per role. Used by
 * `scripts/qa-matrix.sh` and the Phase-1 QA pass.
 *
 * REFUSES TO RUN in production. The hardcoded password (QaPass123!) would
 * trivially compromise admin accounts if executed against real data; the env
 * check is the last line of defense if this script ever ships to a prod
 * environment.
 */
import { PrismaClient, AdminRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

if (process.env.NODE_ENV === 'production') {
  console.error(
    'qa-reset.ts refuses to run with NODE_ENV=production. This script ' +
      'resets admin passwords to a hardcoded dev value.',
  );
  process.exit(1);
}

const prisma = new PrismaClient();

const PASS = 'QaPass123!';

async function ensureUser(email: string, role: AdminRole, name: string) {
  const passwordHash = await bcrypt.hash(PASS, 12);
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) {
    await prisma.adminUser.update({
      where: { email },
      data: { passwordHash, role, name },
    });
    console.log(`  reset: ${email} (${role})`);
  } else {
    await prisma.adminUser.create({
      data: { email, passwordHash, role, name },
    });
    console.log(`  created: ${email} (${role})`);
  }
}

async function main() {
  await ensureUser('admin@tge.ro', AdminRole.SUPER_ADMIN, 'Super Admin');
  await ensureUser('manager@tge.ro', AdminRole.ADMIN, 'Manager');
  await ensureUser('editor@tge.ro', AdminRole.EDITOR, 'Editor');
  await ensureUser('agent@tge.ro', AdminRole.AGENT, 'Agent');
  console.log(`\n  password for all four: ${PASS}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
