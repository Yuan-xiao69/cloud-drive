export const dynamic = 'force-dynamic';
/**
 * API v1 - 探索页 API
 * GET /api/v1/explore/repos - 获取推荐仓库列表
 */

import { NextRequest } from 'next/server';
import { success, paginated, error, handlePrismaError } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { parsePagination, buildPaginationMeta } from '@/lib/api/v1/pagination';

export async function GET(
  req: NextRequest
): Promise<Response> {
  try {
    const { searchParams } = new URL(req.url);
    const { page, size, skip } = parsePagination(searchParams);
    const sort = searchParams.get('sort') || 'stars'; // stars | forks | recent | trending
    const language = searchParams.get('language') || undefined;
    const keyword = searchParams.get('q') || undefined;

    // 获取当前用户（如果有）
    const auth = await getAuthUser(req);

    // 构建查询条件
    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    // 排除当前用户已屏蔽的用户仓库（如果已登录）
    if (auth) {
      const blockedUserIds = await prisma.userBlock.findMany({
        where: { blockerId: auth.userId },
        select: { blockedId: true },
      });
      if (blockedUserIds.length > 0) {
        where.ownerId = { notIn: blockedUserIds.map(b => b.blockedId) };
      }
    }

    // 语言筛选
    if (language) {
      where.language = language;
    }

    // 关键词搜索
    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    // 排序方式
    let orderBy: Record<string, string>[] = [];
    switch (sort) {
      case 'forks':
        orderBy = [{ forkCount: 'desc' }, { createdAt: 'desc' }];
        break;
      case 'recent':
        orderBy = [{ createdAt: 'desc' }, { starCount: 'desc' }];
        break;
      case 'updated':
        orderBy = [{ updatedAt: 'desc' }, { starCount: 'desc' }];
        break;
      case 'trending':
        // 趋势：近期更新 + star 数
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        where.updatedAt = { gte: oneWeekAgo };
        orderBy = [{ updatedAt: 'desc' }, { starCount: 'desc' }];
        break;
      case 'stars':
      default:
        orderBy = [{ starCount: 'desc' }, { createdAt: 'desc' }];
        break;
    }

    const [repos, total] = await Promise.all([
      prisma.repository.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
        orderBy,
        skip,
        take: size,
      }),
      prisma.repository.count({ where }),
    ]);

    // 获取仓库的评论数、issue 数等
    const repoIds = repos.map(r => r.id);
    const [issueCounts, prCounts] = await Promise.all([
      prisma.issue.groupBy({
        by: ['repositoryId'],
        where: { repositoryId: { in: repoIds }, status: 'open', isDeleted: false },
        _count: { id: true },
      }),
      prisma.pullRequest.groupBy({
        by: ['repositoryId'],
        where: { repositoryId: { in: repoIds }, status: 'open', isDeleted: false },
        _count: { id: true },
      }),
    ]);

    const issueCountMap = new Map(issueCounts.map(i => [i.repositoryId, i._count.id]));
    const prCountMap = new Map(prCounts.map(p => [p.repositoryId, p._count.id]));

    const items = repos.map(repo => ({
      id: repo.id,
      name: repo.name,
      description: repo.description ?? undefined,
      language: repo.language ?? undefined,
      visibility: repo.visibility === 1 ? 'public' : 'private',
      starCount: repo.starCount,
      forkCount: repo.forkCount,
      watchCount: repo.watchCount,
      openIssuesCount: issueCountMap.get(repo.id) || 0,
      openPRsCount: prCountMap.get(repo.id) || 0,
      owner: repo.owner,
      defaultBranch: repo.defaultBranch,
      createdAt: repo.createdAt.toISOString(),
      updatedAt: repo.updatedAt.toISOString(),
    }));

    return paginated(items, buildPaginationMeta(total, page, size));
  } catch (err) {
    return handlePrismaError(err, '获取仓库列表失败');
  }
}
