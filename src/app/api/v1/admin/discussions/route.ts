export const dynamic = 'force-dynamic';
/**
 * v1 讨论管理 API
 * GET /api/v1/admin/discussions - 获取讨论列表
 */

import { NextRequest } from 'next/server';
import { success, paginated, handlePrismaError, errors, parsePagination, buildPaginationMeta } from '@/lib/api/v1';
import { requireAdmin, isAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

// GET /api/v1/admin/discussions - 获取讨论列表
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const sp = req.nextUrl.searchParams;
    const { page, size, skip } = parsePagination(sp);
    const keyword = sp.get('keyword')?.trim() || undefined;
    const category = sp.get('category') || undefined;
    const status = sp.get('status') || undefined;

    const where: Prisma.DiscussionWhereInput = {};
    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { author: { username: { contains: keyword, mode: 'insensitive' } } },
      ];
    }
    if (category) where.category = category;
    if (status && ['open', 'resolved'].includes(status)) where.status = status;

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

    const items = discussions.map((d) => ({
      id: d.id,
      title: d.title,
      category: d.category,
      status: d.status,
      authorUsername: d.author.username,
      authorId: d.author.id,
      commentsCount: d._count.comments,
      viewCount: d.viewCount,
      isDeleted: d.isDeleted,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    }));

    const pagination = buildPaginationMeta(total, page, size);
    return paginated(items, pagination);
  } catch (err) {
    return handlePrismaError(err);
  }
}
