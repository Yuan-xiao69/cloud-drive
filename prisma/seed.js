const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient();
  const adminPassword = await bcrypt.hash('root123456', 10);
  
  try {
    const admin = await prisma.user.upsert({
      where: { username: 'root' },
      update: {},
      create: {
        username: 'root',
        email: 'admin@example.com',
        passwordHash: adminPassword,
        role: 'super_admin',
        isSuperAdmin: true,
      },
    });
    console.log('Admin user created:', admin);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
