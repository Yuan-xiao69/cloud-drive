export const dynamic = 'force-dynamic';
/**
 * API v1 - 用户屏蔽列表 API
 * GET /api/v1/me/blocks - 获取当前用户的屏蔽列表
 * POST /api/v1/me/blocks - 屏蔽用户
 * DELETE /api/v1/me/blocks/:userId - 取消屏蔽用户
 */

import { NextRequest } from 'next/server';
import { success, error, handlePrismaError, errors, paginated } from '@/lib/api/v1/response';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parsePagination, buildPaginationMeta } from '@/lib/api/v1/pagination';

// GET /api/v1/me/blocks - 获取当前用户的屏蔽列表
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;

    const { searchParams } = new URL(req.url);
    const { page, size, skip } = parsePagination(searchParams);

    const [items, total] = await Promise.all([
      prisma.userBlock.findMany({
        where: { blockerId: auth.userId },
        skip,
        take: size,
        orderBy: { createdAt: 'desc' },
        include: {
          blocked: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              bio: true,
            },
          },
        },
      }),
      prisma.userBlock.count({ where: { blockerId: auth.userId } }),
    ]);

    // 格式化输出
    const formattedItems = items.map(item => ({
      id: item.id,
      blockedUser: item.blocked,
      createdAt: item.createdAt.toISOString(),
    }));

    return paginated(formattedItems, buildPaginationMeta(total, page, size));
  } catch (err) {
    return handlePrismaError(err);
  }
}

// POST /api/v1/me/blocks - 屏蔽用户
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;

    const body = await req.json();
    const { userId, reason } = body;

    // 参数验证
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      return error('VALIDATION_ERROR', { message: '无效的用户ID' });
    }

    const targetUserId = userId.trim();

    // 不能屏蔽自己
    if (targetUserId === auth.userId) {
      return error('VALIDATION_ERROR', { message: '不能屏蔽自己' });
    }

    // 检查目标用户是否存在
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, username: true },
    });
    if (!targetUser) {
      return errors.notFound('用户');
    }

    // 检查是否已经屏蔽
    const existingBlock = await prisma.userBlock.findFirst({
      where: {
        blockerId: auth.userId,
        blockedId: targetUserId,
      },
    });
    if (existingBlock) {
      return error('RESOURCE_EXISTS', { message: '您已经屏蔽了该用户' });
    }

    // 创建屏蔽记录
    const block = await prisma.userBlock.create({
      data: {
        blockerId: auth.userId,
        blockedId: targetUserId,
      },
      include: {
        blocked: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            bio: true,
          },
        },
      },
    });

    return success({
      id: block.id,
      blockedUser: block.blocked,
      createdAt: block.createdAt.toISOString(),
    }, '已成功屏蔽该用户');
  } catch (err) {
    return handlePrismaError(err);
  }
}

// DELETE /api/v1/me/blocks - 取消屏蔽用户（通过 query 参数指定用户ID）
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId || userId.trim().length === 0) {
      return error('VALIDATION_ERROR', { message: '缺少用户ID参数' });
    }

    const targetUserId = userId.trim();

    // 查找屏蔽记录
    const block = await prisma.userBlock.findFirst({
      where: {
        blockerId: auth.userId,
        blockedId: targetUserId,
      },
    });

    if (!block) {
      return errors.notFound('屏蔽记录');
    }

    // 删除屏蔽记录
    await prisma.userBlock.delete({
      where: { id: block.id },
    });

    return success({ unblocked: true }, '已取消屏蔽该用户');
  } catch (err) {
    return handlePrismaError(err);
  }
}
