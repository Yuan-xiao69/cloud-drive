const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('root123456', 10);
  
  // Delete existing admin first
  await prisma.user.deleteMany({
    where: { username: 'root' }
  });
  
  // Create new admin
  const admin = await prisma.user.create({
    data: {
      username: 'root',
      email: 'admin@example.com',
      password: password,
      role: 'super_admin',
      isSuperAdmin: true,
    },
  });
  console.log('Admin created:', admin);
  
  // Create default settings
  await prisma.settings.upsert({
    where: { id: 'site_settings' },
    update: {},
    create: {
      id: 'site_settings',
      siteName: '悦读听书',
      siteDesc: '一个阅读和听书的平台',
      contactEmail: 'admin@example.com',
    },
  });
  console.log('Settings created');
  
  await prisma.$disconnect();
}

main().catch(console.error);
