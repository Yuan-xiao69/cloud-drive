export const dynamic = 'force-dynamic';
/**
 * v1 仓库管理 API
 * GET /api/v1/admin/repos - 获取仓库列表
 */

import { defineRoute } from '@/lib/framework/define-route';
import { paginated, errors, parsePagination, buildPaginationMeta } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

// GET /api/v1/admin/repos - 获取仓库列表
export const GET = defineRoute({
  auth: 'required',
  async handler({ req, user }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const sp = req.nextUrl.searchParams;
    const { page, size, skip } = parsePagination(sp);
    const keyword = sp.get('keyword')?.trim() || undefined;
    const visibilityParam = sp.get('visibility');
    const visibility = visibilityParam !== null ? parseInt(visibilityParam, 10) : undefined;

    const where: Prisma.RepositoryWhereInput = { deletedAt: null };
    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { owner: { username: { contains: keyword, mode: 'insensitive' } } },
      ];
    }
    if (visibility !== undefined && [0, 1, 2].includes(visibility)) {
      where.visibility = visibility;
    }

    const [repos, total] = await Promise.all([
      prisma.repository.findMany({
        where,
        include: {
          owner: { select: { id: true, username: true, avatarUrl: true } },
          _count: { select: { items: { where: { isDeleted: false, type: 'file' } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: size,
      }),
      prisma.repository.count({ where }),
    ]);

    const items = repos.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? undefined,
      visibility: r.visibility === 1 ? 'public' : 'private',
      ownerUsername: r.owner.username,
      starCount: r.starCount,
      forkCount: r.forkCount,
      language: r.language ?? undefined,
      filesCount: r._count.items,
      createdAt: r.createdAt.toISOString(),
      deletedAt: r.deletedAt?.toISOString() ?? null,
    }));

    const pagination = buildPaginationMeta(total, page, size);

    return paginated(items, pagination);
  },
});
