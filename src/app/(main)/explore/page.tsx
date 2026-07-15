import React from 'react';
import { prisma } from '@/lib/prisma';
import { ExploreContent } from './ExploreContent';

async function fetchExploreData() {
  const [repos, users, discussions] = await Promise.all([
    prisma.repository.findMany({
      where: { deletedAt: null, visibility: 1 },
      select: {
        id: true, name: true, description: true, language: true,
        starCount: true, forkCount: true,
        owner: { select: { username: true, avatarUrl: true } },
      },
      orderBy: { starCount: 'desc' },
      take: 50,
    }),
    prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true, username: true, avatarUrl: true, bio: true,
        _count: { select: { followers: true, repositories: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.discussion.findMany({
      where: { isDeleted: false },
      select: {
        id: true, title: true, category: true, createdAt: true,
        _count: { select: { comments: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    }),
  ]);

  return {
    repos: repos.map(r => ({
      id: r.id, name: r.name, description: r.description, language: r.language,
      starCount: r.starCount, forkCount: r.forkCount,
      owner: r.owner ? { username: r.owner.username, avatarUrl: r.owner.avatarUrl ?? undefined } : null,
    })),
    users: users.map(u => ({
      id: u.id, username: u.username, avatarUrl: u.avatarUrl, bio: u.bio,
      followersCount: u._count.followers, reposCount: u._count.repositories,
    })),
    discussions: discussions.map(d => ({
      id: d.id, title: d.title, category: d.category,
      replyCount: d._count.comments, createdAt: d.createdAt.toISOString(),
    })),
  };
}

export default async function ExplorePage() {
  const initialData = await fetchExploreData();

  return (
    <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen text-[var(--ds-text-secondary)]">加载中...</div>}>
      <ExploreContent initialData={initialData} />
    </React.Suspense>
  );
}
