export const dynamic = 'force-dynamic';

/**
 * v1 获取当前用户收藏列表 API
 * GET /api/v1/me/stars
 */

import { NextRequest } from 'next/server';
import { success, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';
import { parsePagination, buildPaginationMeta } from '@/lib/api/v1/pagination';

// GET /api/v1/me/stars - 获取当前用户收藏列表
export async function GET(
  req: NextRequest
): Promise<Response> {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return errors.unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const pagination = parsePagination(searchParams);

    const [items, total] = await Promise.all([
      prisma.star.findMany({
        where: { userId: auth.userId },
        include: {
          repo: {
            select: {
              id: true,
              name: true,
              description: true,
              language: true,
              starCount: true,
              forkCount: true,
              visibility: true,
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
          },
        },
        orderBy: { createdAt: 'desc' },
        take: pagination.size,
        skip: pagination.skip,
      }),
      prisma.star.count({ where: { userId: auth.userId } }),
    ]);

    return success({
      items: items.map(star => ({
        repoId: star.repoId,
        starredAt: star.createdAt.toISOString(),
        repo: {
          id: star.repo.id,
          name: star.repo.name,
          description: star.repo.description,
          language: star.repo.language,
          starCount: star.repo.starCount,
          forkCount: star.repo.forkCount,
          visibility: star.repo.visibility === 1 ? 'public' : 'private',
          createdAt: star.repo.createdAt.toISOString(),
          owner: star.repo.owner,
        },
      })),
      pagination: buildPaginationMeta(total, pagination.page, pagination.size),
    });
  } catch (err) {
    return handlePrismaError(err, '获取收藏列表失败');
  }
}
