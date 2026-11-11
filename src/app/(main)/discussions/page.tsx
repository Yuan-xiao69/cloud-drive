import React from 'react';
import { auth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma';
import DiscussionsContent from './DiscussionsContent';

// 讨论列表是实时数据，禁止 build 时静态预渲染（避免构建阶段访问数据库）
export const dynamic = 'force-dynamic';

export default async function DiscussionsPage() {
  const [discussions, user] = await Promise.all([
    prisma.discussion.findMany({
      where: { isDeleted: false },
      include: {
        author: { select: { username: true, avatarUrl: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    }),
    auth().catch(() => null),
  ]);

  const initialDiscussions = discussions.map(d => ({
    id: d.id,
    title: d.title,
    content: d.content,
    viewCount: d.viewCount,
    commentCount: d._count.comments,
    category: d.category,
    updatedAt: d.updatedAt.toISOString(),
    tags: d.tags,
    isWiki: d.isWiki,
    author: {
      username: d.author.username,
      avatarUrl: d.author.avatarUrl,
    },
  }));

  return <DiscussionsContent initialDiscussions={initialDiscussions} isLoggedIn={!!user} />;
}
