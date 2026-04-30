// User Profile Page - Server Component
// Fetches initial data on the server side

import { notFound } from 'next/navigation';
import Header from '@/components/layout/Header';
import UserProfileClient from './UserProfileClient';
import { prisma } from '@/lib/prisma';
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
  role: string;
  createdAt: Date;
  _count?: { repositories?: number; stars?: number };
}): UserSummary {
  return {
    id: user.id,
    uid: user.uid ?? undefined,
    username: user.username,
    email: user.email ?? undefined,
    name: undefined,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    isAdmin: user.role === 'admin' || user.role === 'super_admin',
    isSuperAdmin: user.role === 'super_admin',
    createdAt: user.createdAt,
    stats: user._count ? {
      reposCount: user._count.repositories || 0,
      starsCount: user._count.stars || 0,
      followersCount: 0,
      followingCount: 0,
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
    visibility: repo.visibility === 1 ? 'public' : 'private',
    starsCount: repo.starCount || repo._count?.stars || 0,
    forksCount: repo.forkCount || 0,
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

  // Fetch user with stats
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      uid: true,
      username: true,
      email: true,
      bio: true,
      avatarUrl: true,
      location: true,
      website: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          repositories: true,
          stars: true,
        },
      },
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen">
        <Header />
        <div style={{ paddingTop: 80, maxWidth: 1200, margin: '0 auto', padding: '80px 24px 48px', textAlign: 'center' }}>
          <h1>用户不存在</h1>
          <a href="/" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-block' }}>返回首页</a>
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
    <UserProfileClient
      initialUser={transformedUser}
      initialRepos={transformedRepos}
      initialDiscussions={transformedDiscussions}
      initialStars={transformedStars}
      username={username}
    />
  );
}

// Generate metadata
export async function generateMetadata({ params }: PageProps) {
  const { username } = await params;
  return {
    title: `${username} - 代码平台`,
    description: `查看 ${username} 的个人主页、仓库和讨论`,
  };
}
