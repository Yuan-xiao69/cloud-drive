const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Creating demo discussions...');

  const admin = await prisma.user.findUnique({ where: { username: 'root' }});
  if (!admin) {
    console.error('Admin user not found');
    return;
  }

  const discussions = [
    { title: '如何高效学习算法？', content: '最近在刷 LeetCode，感觉效率不高。大家有什么好的学习方法推荐吗？', category: 'general' },
    { title: 'React 18 新特性讨论', content: 'React 18 引入了 Concurrent Features，大家觉得有哪些实际应用场景？', category: 'general' },
    { title: '开源项目协作经验分享', content: '分享一下参与开源项目的经验和心得，希望对新手有帮助。', category: 'general' },
  ];

  for (const discData of discussions) {
    const disc = await prisma.discussion.create({
      data: {
        authorId: admin.id,
        ...discData,
        viewCount: Math.floor(Math.random() * 200) + 50
      }
    });
    console.log('Discussion created:', disc.title);
  }

  console.log('Demo discussions created successfully!');
  await prisma.$disconnect();
}
main();
