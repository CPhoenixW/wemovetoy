import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const defaultPassword = process.env.SEED_DEFAULT_PASSWORD ?? 'ChangeMe123!';

const seedUsers: Array<{
  email: string;
  name: string;
  role: UserRole;
}> = [
  { email: 'user@wemove.local', name: 'Demo User', role: UserRole.USER },
  { email: 'dealer@wemove.local', name: 'Demo Dealer', role: UserRole.DEALER },
  { email: 'admin@wemove.local', name: 'Demo Admin', role: UserRole.ADMIN },
];

async function main() {
  const passwordHash = await bcrypt.hash(defaultPassword, 12);

  for (const user of seedUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { ...user, passwordHash },
      create: { ...user, passwordHash },
    });
  }

  console.log(`Seeded ${seedUsers.length} development users.`);
}

main()
  .catch((error: unknown) => {
    console.error('Database seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
