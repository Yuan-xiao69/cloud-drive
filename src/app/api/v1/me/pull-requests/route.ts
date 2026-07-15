export const dynamic = 'force-dynamic';

/**
 * v1 获取当前用户待处理 PR 列表 API
 * GET /api/v1/me/pull-requests
 *
 * 返回当前用户作为仓库所有者收到的、需要审核的 PR
 */

import { defineRoute } from '@/lib/framework/define-route';
import { success } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { parsePagination, buildPaginationMeta } from '@/lib/api/v1/pagination';

// GET /api/v1/me/pull-requests - 获取当前用户待处理的 PR 列表
export const GET = defineRoute({
  auth: 'required',
  async handler({ req, user }) {
    const { searchParams } = new URL(req.url);
    const pagination = parsePagination(searchParams);
    const status = searchParams.get('status') || 'open'; // 默认只返回 open 状态

    // 获取当前用户拥有的仓库 ID 列表
    const ownedRepos = await prisma.repository.findMany({
      where: {
        ownerId: user!.id,
        deletedAt: null,
      },
      select: { id: true },
    });
    const ownedRepoIds = ownedRepos.map(r => r.id);

    if (ownedRepoIds.length === 0) {
      return success({
        items: [],
        pagination: buildPaginationMeta(0, pagination.page, pagination.size),
      });
    }

    // 查询这些仓库收到的 PR
    const whereClause: Record<string, unknown> = {
      repositoryId: { in: ownedRepoIds },
      isDeleted: false,
    };

    if (status !== 'all') {
      whereClause.status = status;
    }

    const [items, total] = await Promise.all([
      prisma.pullRequest.findMany({
        where: whereClause,
        include: {
          repository: {
            select: {
              id: true,
              name: true,
              owner: {
                select: {
                  id: true,
                  username: true,
                  avatarUrl: true,
                },
              },
            },
          },
          author: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
          sourceRepo: {
            select: {
              name: true,
              owner: {
                select: {
                  username: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: pagination.size,
        skip: pagination.skip,
      }),
      prisma.pullRequest.count({ where: whereClause }),
    ]);

    return success({
      items: items.map(pr => ({
        id: pr.id,
        title: pr.title,
        status: pr.status,
        sourceBranch: pr.sourceBranch,
        targetBranch: pr.targetBranch,
        createdAt: pr.createdAt.toISOString(),
        updatedAt: pr.updatedAt.toISOString(),
        repository: {
          id: pr.repository.id,
          name: pr.repository.name,
          owner: pr.repository.owner,
        },
        author: pr.author,
        sourceRepo: pr.sourceRepo ? {
          name: pr.sourceRepo.name,
          owner: pr.sourceRepo.owner,
        } : null,
      })),
      pagination: buildPaginationMeta(total, pagination.page, pagination.size),
    });
  },
});
