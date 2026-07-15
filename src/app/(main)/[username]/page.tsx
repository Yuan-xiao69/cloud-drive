// User Profile Page - Server Component
// Fetches initial data on the server side

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import UserProfileClient from './UserProfileClient';
import { prisma } from '@/lib/prisma';
import { Button, PageLayout, PageLayoutContent } from '@/components/design';
import type { UserSummary, RepositorySummary, DiscussionSummary } from '@/types';
import type { Prisma } from '@prisma/client';

interface PageProps {
  params: Promise<{ username: string }>;
}

// Helper to transform Prisma user to UserSummary
function transformUser(user: {
  id: string;
  uid: string | null;
  username: string;
  email: string | null;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  role: string;
  createdAt: Date;
  _count?: { repositories?: number; stars?: number; followers?: number; following?: number };
}): UserSummary {
  return {
    id: user.id,
    uid: user.uid ?? undefined,
    username: user.username,
    email: user.email ?? undefined,
    name: undefined,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    location: user.location,
    website: user.website,
    isAdmin: user.role === 'admin' || user.role === 'super_admin',
    isSuperAdmin: user.role === 'super_admin',
    createdAt: user.createdAt,
    stats: user._count ? {
      reposCount: user._count.repositories || 0,
      starsCount: user._count.stars || 0,
      followersCount: user._count.followers || 0,
      followingCount: user._count.following || 0,
    } : undefined,
  };
}

// Helper to transform Prisma repository to RepositorySummary
function transformRepo(repo: {
  id: string;
  name: string;
  ownerId: string;
  owner?: { username: string; name?: string | null; avatarUrl?: string | null } | null;
  description?: string | null;
  visibility: number;
  starCount?: number;
  forkCount?: number;
  watchCount?: number;
  language?: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { stars?: number };
}): RepositorySummary {
  return {
    id: repo.id,
    name: repo.name,
    ownerId: repo.ownerId,
    ownerUsername: repo.owner?.username || '',
    ownerName: repo.owner?.name,
    ownerAvatar: repo.owner?.avatarUrl,
    description: repo.description,
    visibility: repo.visibility === 0 ? 'private' : 'public',
    starCount: repo.starCount || repo._count?.stars || 0,
    forkCount: repo.forkCount || 0,
    watchersCount: repo.watchCount || 0,
    language: repo.language,
    createdAt: repo.createdAt,
    updatedAt: repo.updatedAt,
  };
}

// Helper to transform Prisma discussion to DiscussionSummary
function transformDiscussion(discussion: {
  id: string;
  title: string;
  content: string;
  category: string;
  authorId: string;
  author?: { username: string; name?: string | null; avatarUrl?: string | null } | null;
  repositoryId?: string | null;
  repository?: { name: string; owner?: { username: string } } | null;
  _count?: { comments?: number };
  viewCount?: number;
  isPinned?: boolean;
  isLocked?: boolean;
  createdAt: Date;
  updatedAt: Date;
}): DiscussionSummary {
  return {
    id: discussion.id,
    title: discussion.title,
    content: discussion.content,
    category: discussion.category as DiscussionSummary['category'],
    authorId: discussion.authorId,
    authorUsername: discussion.author?.username || '',
    authorName: discussion.author?.name,
    authorAvatarUrl: discussion.author?.avatarUrl,
    repositoryId: discussion.repositoryId,
    repositoryName: discussion.repository?.name,
    repositoryOwnerUsername: discussion.repository?.owner?.username,
    commentsCount: discussion._count?.comments || 0,
    viewsCount: discussion.viewCount || 0,
    isPinned: discussion.isPinned || false,
    isLocked: discussion.isLocked || false,
    createdAt: discussion.createdAt,
    updatedAt: discussion.updatedAt,
  };
}

export default async function UserProfilePage({ params }: PageProps) {
  const { username } = await params;

  // 按用户名查找（UID 用于内部标识，URL 用用户名）
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true, uid: true, username: true, email: true, bio: true,
      avatarUrl: true, location: true, website: true, role: true, createdAt: true,
      _count: { select: { repositories: true, stars: true, followers: true, following: true } },
    },
  });

  if (!user) {
    return (
      <div className="flex-1 min-w-0">
        <div className="max-w-[var(--ds-container-max)] mx-auto pt-20 pb-12 px-6 text-center">
          <h1>用户不存在</h1>
          <Link href="/"><Button variant="primary">返回首页</Button></Link>
        </div>
      </div>
    );
  }

  // Fetch repositories (public only for non-owner)
  const repositories = await prisma.repository.findMany({
    where: {
      ownerId: user.id,
      visibility: 1, // 1 = public
      deletedAt: null,
    },
    include: {
      owner: {
        select: { username: true, avatarUrl: true },
      },
      _count: {
        select: { stars: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  });

  // Fetch discussions
  const discussions = await prisma.discussion.findMany({
    where: {
      authorId: user.id,
      isDeleted: false,
    },
    include: {
      author: {
        select: { username: true, avatarUrl: true },
      },
      _count: {
        select: { comments: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  // Fetch starred repositories
  const starredRepos = await prisma.star.findMany({
    where: { userId: user.id },
    include: {
      repo: {
        include: {
          owner: {
            select: { username: true, avatarUrl: true },
          },
          _count: {
            select: { stars: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  // Transform data
  const transformedUser = transformUser(user);
  const transformedRepos = repositories.map(transformRepo);
  const transformedDiscussions = discussions.map(transformDiscussion);
  const transformedStars = starredRepos
    .filter(s => s.repo && !s.repo.deletedAt)
    .map(s => transformRepo(s.repo));

  return (
    <PageLayout containerWidth="wide"><PageLayoutContent>
    <UserProfileClient
      initialUser={transformedUser}
      initialRepos={transformedRepos}
      initialDiscussions={transformedDiscussions}
      initialStars={transformedStars}
      username={username}
    />
    </PageLayoutContent></PageLayout>
  );
}

// Generate metadata
export async function generateMetadata({ params }: PageProps) {
  const { username } = await params;
  return {
    title: `${username} - 文件平台`,
    description: `查看 ${username} 的个人主页、仓库和讨论`,
  };
}
