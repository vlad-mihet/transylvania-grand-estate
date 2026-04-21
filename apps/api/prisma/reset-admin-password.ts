import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@tge.ro';
  const password = 'admin123';
  const passwordHash = await bcrypt.hash(password, 12);

  const updated = await prisma.adminUser.update({
    where: { email },
    data: { passwordHash },
  });

  console.log(`  Password reset for ${updated.email} -> ${password}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
