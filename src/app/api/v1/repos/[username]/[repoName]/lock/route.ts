export const dynamic = 'force-dynamic';
/**
 * v1 仓库锁定/归档 API
 * POST /api/v1/repos/[username]/[repoName]/lock - 锁定/解锁仓库
 * POST /api/v1/repos/[username]/[repoName]/archive - 归档/取消归档仓库
 */

import { NextRequest } from 'next/server';
import { success, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';
import { recordActivityLog } from '@/lib/activity-log';

// POST /api/v1/repos/[username]/[repoName]/lock
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
    const body = await req.json();
    const { lock, reason } = body;

    if (typeof lock !== 'boolean') {
      return errors.badRequest('请指定 lock 参数 (true/false)');
    }

    // 获取仓库
    const repo = await prisma.repository.findFirst({
      where: {
        owner: { username },
        name: repoName,
        deletedAt: null,
      },
      select: { id: true, ownerId: true, isLocked: true },
    });

    if (!repo) {
      return error(ErrorCodes.NOT_FOUND, { message: '仓库不存在' });
    }

    // 只有仓库所有者可以锁定/解锁
    if (repo.ownerId !== auth.userId) {
      return error(ErrorCodes.FORBIDDEN, { message: '只有仓库所有者可以锁定仓库' });
    }

    // 执行锁定/解锁
    const updatedRepo = await prisma.repository.update({
      where: { id: repo.id },
      data: { isLocked: lock },
      select: { id: true, name: true, isLocked: true },
    });

    // 记录活动日志
    await recordActivityLog({
      userId: auth.userId,
      action: lock ? 'lock_repo' : 'unlock_repo',
      targetType: 'repo',
      targetId: repo.id,
      targetName: repoName,
      details: {
        reason: reason || (lock ? '仓库被锁定' : '仓库已解锁'),
      },
    });

    return success({
      id: updatedRepo.id,
      name: updatedRepo.name,
      isLocked: updatedRepo.isLocked,
      message: lock ? '仓库已锁定' : '仓库已解锁',
    }, lock ? '仓库锁定成功' : '仓库解锁成功');
  } catch (err) {
    return handlePrismaError(err, '仓库锁定操作失败');
  }
}
