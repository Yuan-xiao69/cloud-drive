export const dynamic = 'force-dynamic';
/**
 * API v1 - 用户拉黑 API
 * GET /api/v1/users/[username]/block - 检查拉黑状态
 * POST /api/v1/users/[username]/block - 拉黑/取消拉黑
 */

import { NextRequest } from 'next/server';
import { success, error, handlePrismaError } from '@/lib/api/v1/response';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';

// GET /api/v1/users/[username]/block-status -> 由 block/route.ts 处理
// GET /api/v1/users/[username]/block - 检查当前用户是否拉黑了目标用户
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;

    const { username } = await params;

    // 查找目标用户
    const targetUser = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!targetUser) {
      return error('NOT_FOUND', { message: '用户不存在' });
    }

    // 检查拉黑状态
    const block = await prisma.userBlock.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: auth.userId,
          blockedId: targetUser.id,
        },
      },
      select: { id: true },
    });

    return success({ isBlocked: !!block });
  } catch (err) {
    return handlePrismaError(err);
  }
}

// POST /api/v1/users/[username]/block - 拉黑/取消拉黑
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;

    // 速率限制
    const rateLimit = await checkRateLimit(req, 'api'); // 使用严格的速率限制
    if (!rateLimit.allowed) {
      return error('RATE_LIMITED', { message: '操作过于频繁，请稍后再试' });
    }

    const { username } = await params;

    // 查找目标用户
    const targetUser = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true },
    });
    if (!targetUser) {
      return error('NOT_FOUND', { message: '用户不存在' });
    }

    // 不能拉黑自己
    if (targetUser.id === auth.userId) {
      return error('INVALID_OPERATION', { message: '不能拉黑自己' });
    }

    // 解析请求体
    const body = await req.json();
    const { action } = body;

    if (action === 'block') {
      // 拉黑
      const existing = await prisma.userBlock.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: auth.userId,
            blockedId: targetUser.id,
          },
        },
        select: { id: true },
      });
      if (existing) {
        return error('RESOURCE_EXISTS', { message: '已拉黑该用户' });
      }

      await prisma.userBlock.create({
        data: {
          blockerId: auth.userId,
          blockedId: targetUser.id,
        },
      });

      // 同时移除关注关系（如果存在）
      await prisma.userFollow.deleteMany({
        where: {
          OR: [
            { followerId: auth.userId, followingId: targetUser.id },
            { followerId: targetUser.id, followingId: auth.userId },
          ],
        },
      });

      return success({ blocked: true }, '拉黑成功');
    } else if (action === 'unblock') {
      // 取消拉黑
      const existing = await prisma.userBlock.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: auth.userId,
            blockedId: targetUser.id,
          },
        },
        select: { id: true },
      });
      if (!existing) {
        return error('NOT_FOUND', { message: '未拉黑该用户' });
      }

      await prisma.userBlock.delete({
        where: { id: existing.id },
      });

      return success({ blocked: false }, '取消拉黑成功');
    } else {
      return error('INVALID_OPERATION', { message: '无效的操作，请使用 block 或 unblock' });
    }
  } catch (err) {
    return handlePrismaError(err);
  }
}
