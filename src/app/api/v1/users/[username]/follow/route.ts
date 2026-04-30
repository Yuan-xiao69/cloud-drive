export const dynamic = 'force-dynamic';
/**
 * v1 用户关注 API
 * POST /api/v1/users/[username]/follow - 关注/取消关注用户
 */

import { NextRequest } from 'next/server';
import { success, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';

// POST /api/v1/users/[username]/follow - 关注/取消关注
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
): Promise<Response> {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return errors.unauthorized();
    }

    const { username } = await params;

    // 查找目标用户
    const targetUser = await prisma.user.findFirst({
      where: { username, isSystem: false },
      select: { id: true, username: true },
    });

    if (!targetUser) {
      return error(ErrorCodes.NOT_FOUND, { message: '用户不存在' });
    }

    if (targetUser.id === auth.userId) {
      return errors.forbidden('不能关注自己');
    }

    // 检查是否已关注
    const existing = await prisma.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId: auth.userId,
          followingId: targetUser.id,
        },
      },
    });

    if (existing) {
      // 取消关注
      await prisma.userFollow.delete({ where: { id: existing.id } });
      return success({ following: false }, '已取消关注');
    } else {
      // 添加关注
      await prisma.userFollow.create({
        data: { followerId: auth.userId, followingId: targetUser.id },
      });
      return success({ following: true }, '已关注用户');
    }
  } catch (err) {
    return handlePrismaError(err, '关注操作失败');
  }
}
