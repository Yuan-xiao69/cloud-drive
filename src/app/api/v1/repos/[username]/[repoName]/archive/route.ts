export const dynamic = 'force-dynamic';
/**
 * v1 仓库归档 API
 * POST /api/v1/repos/[username]/[repoName]/archive - 归档/取消归档仓库
 */

import { NextRequest } from 'next/server';
import { success, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';
import { recordActivityLog } from '@/lib/activity-log';

// POST /api/v1/repos/[username]/[repoName]/archive
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
    const { archive } = body;

    if (typeof archive !== 'boolean') {
      return errors.badRequest('请指定 archive 参数 (true/false)');
    }

    // 获取仓库
    const repo = await prisma.repository.findFirst({
      where: {
        owner: { username },
        name: repoName,
        deletedAt: null,
      },
      select: { id: true, ownerId: true, isArchived: true },
    });

    if (!repo) {
      return error(ErrorCodes.NOT_FOUND, { message: '仓库不存在' });
    }

    // 只有仓库所有者可以归档/取消归档
    if (repo.ownerId !== auth.userId) {
      return error(ErrorCodes.FORBIDDEN, { message: '只有仓库所有者可以归档仓库' });
    }

    // 执行归档/取消归档
    const updatedRepo = await prisma.repository.update({
      where: { id: repo.id },
      data: { isArchived: archive },
      select: { id: true, name: true, isArchived: true },
    });

    // 记录活动日志
    await recordActivityLog({
      userId: auth.userId,
      action: archive ? 'archive_repo' : 'unarchive_repo',
      targetType: 'repo',
      targetId: repo.id,
      targetName: repoName,
      details: {
        message: archive ? '仓库已归档' : '仓库已取消归档',
      },
    });

    return success({
      id: updatedRepo.id,
      name: updatedRepo.name,
      isArchived: updatedRepo.isArchived,
      message: archive ? '仓库已归档' : '仓库已取消归档',
    }, archive ? '仓库归档成功' : '仓库取消归档成功');
  } catch (err) {
    return handlePrismaError(err, '仓库归档操作失败');
  }
}
