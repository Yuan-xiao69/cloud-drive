/**
 * 数据库初始化种子脚本
 * 用途：创建超级管理员账号（若不存在）
 * 运行方式：npx ts-node prisma/seed.ts
 * 或通过 package.json 中的 prisma.seed 配置
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * 生成下一个 uid（9位顺序编号）
 * @param prisma PrismaClient 实例
 * @returns 下一个可用的 uid 字符串
 */
async function generateNextUid(prisma: PrismaClient): Promise<string> {
  const lastUser = await prisma.user.findFirst({
    where: { uid: { not: null } },
    orderBy: { uid: 'desc' },
    select: { uid: true },
  });
  if (lastUser?.uid) {
    return String(parseInt(lastUser.uid, 10) + 1).padStart(9, '0');
  }
  return '000000001';
}

async function main() {
  // 超级管理员（最高权限，可提升其他用户为管理员）
  // 使用环境变量配置，支持自定义
  // 注意：超级管理员不分配 uid（isSystem = true）
  const rootAdmin = {
    username: process.env.ROOT_ADMIN_USERNAME || 'root',
    email: process.env.ROOT_ADMIN_EMAIL || 'root@localhost',
    password: process.env.ROOT_ADMIN_PASSWORD || 'root123456',
    role: 'super_admin' as const,
    bio: '系统内置超级管理员',
    isSystem: true, // 标记为系统内置，无法删除
  };

  // 检查超级管理员是否存在（按 username 精确匹配，避免重复）
  const existingRoot = await prisma.user.findFirst({
    where: { username: rootAdmin.username },
  });

  if (existingRoot) {
    console.log(`✅ 超级管理员已存在: ${existingRoot.username}`);
    // 如果已存在但不是系统内置，更新它
    if (!existingRoot.isSystem) {
      await prisma.user.update({
        where: { id: existingRoot.id },
        data: { isSystem: true },
      });
      console.log(`   → 已标记为系统内置账号`);
    }
  } else {
    const passwordHash = await bcrypt.hash(rootAdmin.password, 12);
    await prisma.user.create({
      data: {
        username: rootAdmin.username,
        email: rootAdmin.email,
        passwordHash,
        role: rootAdmin.role,
        bio: rootAdmin.bio,
        isSystem: rootAdmin.isSystem,
        // 超级管理员不分配 uid
      },
    });
    console.log(`✅ 超级管理员已创建:`);
    console.log(`   用户名: ${rootAdmin.username}`);
    console.log(`   邮箱: ${rootAdmin.email}`);
    console.log(`   密码: ${rootAdmin.password}`);
    console.log(`   角色: super_admin (系统内置，无uid)`);
  }

  // ⚠️ 普通管理员账号由超级管理员手动创建，不在种子脚本中生成
  // 如需创建：使用超级管理员后台 → 用户管理 → 提升权限

  // 创建演示用户（仅开发环境）
  if (process.env.NODE_ENV !== 'production') {
    const demoUsers = [
      {
        username: 'octocat',
        email: 'octocat@example.com',
        password: 'Demo@123456',
        bio: 'The GitHub Octocat',
        avatarUrl: 'https://avatars.githubusercontent.com/u/583231?v=4',
      },
      {
        username: 'defunkt',
        email: 'defunkt@example.com',
        password: 'Demo@123456',
        bio: 'Co-founder of GitHub',
        avatarUrl: 'https://avatars.githubusercontent.com/u/2?v=4',
      },
    ];

    for (const u of demoUsers) {
      const existing = await prisma.user.findFirst({ where: { username: u.username } });
      if (!existing) {
        const passwordHash = await bcrypt.hash(u.password, 10);
        const uid = await generateNextUid(prisma);
        await prisma.user.create({
          data: {
            username: u.username,
            email: u.email,
            passwordHash,
            bio: u.bio,
            avatarUrl: u.avatarUrl,
            uid, // 普通用户需要 uid
          },
        });
        console.log(`✅ 演示用户已创建: ${u.username} (uid: ${uid})`);
      }
    }
  }

  console.log('\n🚀 数据库种子数据初始化完成！');
}

main()
  .catch((e) => {
    console.error('❌ 种子初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
