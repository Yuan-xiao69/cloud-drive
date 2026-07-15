import React from 'react';
import { prisma } from '@/lib/prisma';
import { formatTimeAgo } from '@/lib/utils';
import HomePageContent from './HomePageContent';

export const revalidate = 15;

async function fetchHotRepos() {
  try {
    const repos = await prisma.repository.findMany({
      where: { deletedAt: null, visibility: 1 },
      select: {
        id: true, name: true, description: true, language: true,
        starCount: true, forkCount: true, updatedAt: true,
        owner: { select: { username: true, avatarUrl: true } },
      },
      orderBy: { starCount: 'desc' },
      take: 6,
    });
    return repos.map(r => {
      const updatedAt = r.updatedAt.toISOString();
      return {
        id: r.id, name: r.name, description: r.description, language: r.language,
        starCount: r.starCount, forkCount: r.forkCount,
        owner: r.owner ? { username: r.owner.username, avatarUrl: r.owner.avatarUrl ?? undefined } : null,
        updatedAt,
        updatedAtFormatted: formatTimeAgo(updatedAt),
      };
    });
  } catch {
    return [];
  }
}

async function fetchStats() {
  try {
    const [repos, users, discussions] = await Promise.all([
      prisma.repository.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.discussion.count({ where: { isDeleted: false } }),
    ]);
    return { repos, users, discussions };
  } catch {
    return { repos: 0, users: 0, discussions: 0 };
  }
}

export default async function Page() {
  const [hotRepos, stats] = await Promise.all([
    fetchHotRepos(),
    fetchStats(),
  ]);

  return <HomePageContent hotRepos={hotRepos} stats={stats} />;
}
