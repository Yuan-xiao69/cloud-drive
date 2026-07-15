export const dynamic = 'force-dynamic';

/**
 * v1 获取当前用户仓库列表 API
 * GET /api/v1/me/repos
 */

import { defineRoute } from '@/lib/framework/define-route';
import { success } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { parsePagination, buildPaginationMeta } from '@/lib/api/v1/pagination';

// GET /api/v1/me/repos - 获取当前用户仓库列表
export const GET = defineRoute({
  auth: 'required',
  async handler({ req, user }) {
    const { searchParams } = new URL(req.url);
    const pagination = parsePagination(searchParams);

    const [items, total] = await Promise.all([
      prisma.repository.findMany({
        where: {
          ownerId: user!.id,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          description: true,
          language: true,
          visibility: true,
          isFork: true,
          starCount: true,
          forkCount: true,
          watchCount: true,
          createdAt: true,
          updatedAt: true,
          owner: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: pagination.size,
        skip: pagination.skip,
      }),
      prisma.repository.count({
        where: {
          ownerId: user!.id,
          deletedAt: null,
        },
      }),
    ]);

    return success({
      items: items.map(repo => ({
        id: repo.id,
        name: repo.name,
        description: repo.description,
        language: repo.language,
        visibility: repo.visibility === 1 ? 'public' : 'private',
        isFork: repo.isFork,
        starCount: repo.starCount,
        forkCount: repo.forkCount,
        watchCount: repo.watchCount,
        createdAt: repo.createdAt.toISOString(),
        updatedAt: repo.updatedAt.toISOString(),
        owner: repo.owner,
      })),
      pagination: buildPaginationMeta(total, pagination.page, pagination.size),
    });
  },
});
