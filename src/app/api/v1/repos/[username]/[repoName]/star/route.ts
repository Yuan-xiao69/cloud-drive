export const dynamic = 'force-dynamic';
/**
 * v1 仓库收藏 API
 * POST /api/v1/repos/[username]/[repoName]/star - 收藏/取消收藏仓库
 */

import { NextRequest } from 'next/server';
import { success, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';

// POST /api/v1/repos/[username]/[repoName]/star - 收藏/取消收藏
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

    // 查找仓库
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

    // 不能收藏自己的仓库
    if (repo.ownerId === auth.userId) {
      return errors.forbidden('不能收藏自己的仓库');
    }

    // 检查是否已收藏
    const existing = await prisma.star.findUnique({
      where: {
        userId_repoId: {
          userId: auth.userId,
          repoId: repo.id,
        },
      },
    });

    if (existing) {
      // 取消收藏
      await prisma.star.delete({
        where: { id: existing.id },
      });
      await prisma.repository.update({
        where: { id: repo.id },
        data: { starCount: { decrement: 1 } },
      });
      return success({ starred: false }, '已取消收藏');
    } else {
      // 添加收藏
      await prisma.star.create({
        data: { userId: auth.userId, repoId: repo.id },
      });
      await prisma.repository.update({
        where: { id: repo.id },
        data: { starCount: { increment: 1 } },
      });
      return success({ starred: true }, '已收藏仓库');
    }
  } catch (err) {
    return handlePrismaError(err, '收藏操作失败');
  }
}
