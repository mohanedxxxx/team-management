import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const hashedPassword = await hash('191979', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'mhndsyd872@gmail.com' },
    update: {},
    create: {
      email: 'mhndsyd872@gmail.com',
      name: 'محمود',
      password: hashedPassword,
    },
  });

  console.log('Admin user created:', admin.email);

  // Create default team
  const team = await prisma.team.upsert({
    where: { inviteCode: 'TEAM2024' },
    update: {},
    create: {
      name: 'الفريق الرئيسي',
      description: 'الفريق الافتراضي للنظام',
      inviteCode: 'TEAM2024',
    },
  });

  console.log('Default team created:', team.name);

  // Add admin to team
  await prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId: team.id,
        userId: admin.id,
      },
    },
    update: {},
    create: {
      teamId: team.id,
      userId: admin.id,
      role: 'ADMIN',
    },
  });

  console.log('Admin added to team');
  console.log('\n--- Login Info ---');
  console.log('Email: mhndsyd872@gmail.com');
  console.log('Password: 191979');
  console.log('Invite Code: TEAM2024');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
