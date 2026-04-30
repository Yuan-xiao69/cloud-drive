const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Creating demo data...');

  const admin = await prisma.user.findUnique({ where: { username: 'root' }});
  if (!admin) {
    console.error('Admin user not found');
    return;
  }

  // Create demo repositories
  const repos = [
    { name: 'awesome-algorithm', description: '算法学习笔记和实现，包含常见数据结构、排序算法、图算法等', language: 'TypeScript', starCount: 128, forkCount: 45 },
    { name: 'react-components', description: '收集整理的 React 常用组件库，包含表格、表单、弹窗等', language: 'TypeScript', starCount: 89, forkCount: 23 },
    { name: 'python-scripts', description: 'Python 实用脚本集合，用于日常自动化任务', language: 'Python', starCount: 56, forkCount: 18 },
  ];

  for (const repoData of repos) {
    const repo = await prisma.repository.create({
      data: {
        ownerId: admin.id,
        ...repoData,
        visibility: 1,
        defaultBranch: 'main'
      }
    });
    console.log('Repository created:', repo.name);
  }

  // Create demo discussions
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

  console.log('Demo data created successfully!');
  await prisma.$disconnect();
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
