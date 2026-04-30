export const dynamic = 'force-dynamic';
/**
 * v1 仓库关注 API
 * POST /api/v1/repos/[username]/[repoName]/watch - 关注/取消关注仓库
 */

import { NextRequest } from 'next/server';
import { success, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';

// POST /api/v1/repos/[username]/[repoName]/watch - 关注/取消关注
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ username: string; repoName: string }> }
): Promise<Response> {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return errors.unauthorized();
    }

    const { username, repoName } = await params;

    const repo = await prisma.repository.findFirst({
      where: {
        owner: { username },
        name: repoName,
        deletedAt: null,
      },
      select: { id: true, ownerId: true, name: true },
    });

    if (!repo) {
      return error(ErrorCodes.NOT_FOUND, { message: '仓库不存在' });
    }

    if (repo.ownerId === auth.userId) {
      return errors.forbidden('不能关注自己的仓库');
    }

    // 检查是否已关注
    const existing = await prisma.watcher.findUnique({
      where: {
        userId_repoId: {
          userId: auth.userId,
          repoId: repo.id,
        },
      },
    });

    if (existing) {
      // 取消关注
      await prisma.watcher.delete({ where: { id: existing.id } });
      await prisma.repository.update({
        where: { id: repo.id },
        data: { watchCount: { decrement: 1 } },
      });
      return success({ watching: false }, '已取消关注');
    } else {
      // 添加关注
      await prisma.watcher.create({
        data: { userId: auth.userId, repoId: repo.id },
      });
      await prisma.repository.update({
        where: { id: repo.id },
        data: { watchCount: { increment: 1 } },
      });
      return success({ watching: true }, '已关注仓库');
    }
  } catch (err) {
    return handlePrismaError(err, '关注操作失败');
  }
}
