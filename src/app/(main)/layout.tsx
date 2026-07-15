import { auth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma';
import { SidebarDataProvider } from '@/lib/contexts/SidebarDataContext';
import type { SidebarData } from '@/lib/contexts/SidebarDataContext';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  let data: SidebarData = {
    myRepos: [],
    incomingPRs: [],
    starredRepos: [],
    isAuthenticated: false,
    username: null,
    avatarUrl: null,
    role: null,
  };

  try {
    const user = await auth();
    if (user) {
      const [repos, prs, stars] = await Promise.all([
        prisma.repository.findMany({
          where: { ownerId: user.id, deletedAt: null },
          include: {
            owner: { select: { id: true, username: true, avatarUrl: true } },
          },
          take: 8,
          orderBy: { updatedAt: 'desc' },
        }),
        prisma.pullRequest.findMany({
          where: {
            repository: { ownerId: user.id },
            status: 'open',
          },
          include: {
            repository: { select: { id: true, name: true, owner: { select: { username: true } } } },
            author: { select: { username: true, avatarUrl: true } },
          },
          take: 5,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.star.findMany({
          where: { userId: user.id },
          include: {
            repo: {
              include: {
                owner: { select: { id: true, username: true, avatarUrl: true } },
              },
            },
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      data = {
        myRepos: repos.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          language: r.language,
          visibility: (r.visibility === 0 ? 'private' : 'public') as 'public' | 'private',
          isFork: r.isFork,
          starCount: r.starCount,
          forkCount: r.forkCount,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
          owner: {
            id: r.owner.id,
            username: r.owner.username,
            avatarUrl: r.owner.avatarUrl as string | null,
          },
        })),
        incomingPRs: prs.map((p) => ({
          id: p.id,
          title: p.title,
          status: p.status,
          sourceBranch: p.sourceBranch,
          targetBranch: p.targetBranch,
          createdAt: p.createdAt.toISOString(),
          repository: {
            id: p.repository.id,
            name: p.repository.name,
            owner: { username: p.repository.owner.username },
          },
          author: {
            username: p.author.username,
            avatarUrl: p.author.avatarUrl as string | null,
          },
        })),
        starredRepos: stars.map((s) => ({
          repoId: s.repoId,
          starredAt: s.createdAt.toISOString(),
          repo: {
            id: s.repo.id,
            name: s.repo.name,
            description: s.repo.description,
            language: s.repo.language,
            starCount: s.repo.starCount,
            forkCount: s.repo.forkCount,
            visibility: (s.repo.visibility === 0 ? 'private' : 'public') as 'public' | 'private',
            createdAt: s.repo.createdAt.toISOString(),
            owner: {
              id: s.repo.owner.id,
              username: s.repo.owner.username,
              avatarUrl: s.repo.owner.avatarUrl as string | null,
            },
          },
        })),
        isAuthenticated: true,
        username: user.username,
        avatarUrl: user.avatar || null,
        role: user.role,
      };
    }
  } catch (error) {
    console.error('[MainLayout] 侧栏数据查询失败:', error);
  }

  return <SidebarDataProvider data={data}>{children}</SidebarDataProvider>;
}
