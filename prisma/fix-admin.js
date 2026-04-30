const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 更新 root 用户为管理员
  const updated = await prisma.user.updateMany({
    where: { username: 'root' },
    data: { 
      role: 'admin',
      isSuperAdmin: true 
    }
  });
  console.log('Updated admin:', updated);
  
  // 查看所有用户
  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true, isSuperAdmin: true }
  });
  console.log('All users:', users);
  
  await prisma.$disconnect();
}

main().catch(console.error);
