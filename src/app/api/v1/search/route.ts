export const dynamic = 'force-dynamic';
/**
 * v1 搜索 API
 * GET /api/v1/search?q=&type=&page=&size= - 综合搜索
 */

import { NextRequest } from 'next/server';
import { success, error, paginated, handlePrismaError, parsePagination, buildPaginationMeta } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/lib/api/v1';

// GET /api/v1/search?q=&type=&page=&size=
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const sp = req.nextUrl.searchParams;
    const q = sp.get('q')?.trim() || '';
    const type = sp.get('type') || 'repos'; // repos | users | discussions
    const { page, size, skip } = parsePagination(sp);

    if (type === 'repos') {
      // 搜索所有未删除的仓库（包括私有，但当前用户有权限的）
      const where = q ? {
        deletedAt: null,
        OR: [
          { name: { contains: q, mode: 'insensitive' as const } },
          { description: { contains: q, mode: 'insensitive' as const } },
        ],
      } : {
        deletedAt: null,
      };

      const [repos, total] = await Promise.all([
        prisma.repository.findMany({
          where,
          include: { owner: { select: { id: true, username: true, avatarUrl: true } } },
          orderBy: { starCount: 'desc' },
          skip,
          take: size,
        }),
        prisma.repository.count({ where }),
      ]);

      return paginated(
        repos.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description ?? undefined,
          owner: { id: r.owner.id, username: r.owner.username, avatarUrl: r.owner.avatarUrl ?? undefined },
          starCount: r.starCount,
          forkCount: r.forkCount,
          language: r.language ?? undefined,
          createdAt: r.createdAt.toISOString(),
        })),
        { ...buildPaginationMeta(total, page, size), type: 'repos' as const }
      );
    }

    if (type === 'users') {
      // 空搜索时返回所有用户
      const where = q ? {
        OR: [
          { username: { contains: q, mode: 'insensitive' as const } },
          { bio: { contains: q, mode: 'insensitive' as const } },
        ],
      } : {};

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          include: {
            _count: { select: { repositories: true } },
          },
          skip,
          take: size,
        }),
        prisma.user.count({ where }),
      ]);

      return paginated(
        users.map((u) => ({
          id: u.id,
          username: u.username,
          avatarUrl: u.avatarUrl ?? undefined,
          bio: u.bio ?? undefined,
          location: u.location ?? undefined,
          createdAt: u.createdAt.toISOString(),
          reposCount: u._count.repositories,
        })),
        { ...buildPaginationMeta(total, page, size), type: 'users' as const }
      );
    }

    if (type === 'discussions') {
      // 空搜索时返回所有讨论
      const where = q ? {
        isDeleted: false,
        OR: [
          { title: { contains: q, mode: 'insensitive' as const } },
          { content: { contains: q, mode: 'insensitive' as const } },
        ],
      } : { isDeleted: false };

      const [discussions, total] = await Promise.all([
        prisma.discussion.findMany({
          where,
          include: {
            author: { select: { id: true, username: true, avatarUrl: true } },
            _count: { select: { comments: { where: { isDeleted: false } } } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: size,
        }),
        prisma.discussion.count({ where }),
      ]);

      return paginated(
        discussions.map((d) => ({
          id: d.id,
          title: d.title,
          category: d.category,
          status: d.status,
          author: { id: d.author.id, username: d.author.username, avatarUrl: d.author.avatarUrl ?? undefined },
          commentCount: d._count.comments,
          viewCount: d.viewCount,
          createdAt: d.createdAt.toISOString(),
        })),
        { ...buildPaginationMeta(total, page, size), type: 'discussions' as const }
      );
    }

    return error(ErrorCodes.INVALID_PARAMS, { message: '无效的搜索类型，支持: repos, users, discussions' });
  } catch (err) {
    return handlePrismaError(err, '搜索失败');
  }
}
