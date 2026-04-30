export const dynamic = 'force-dynamic';
/**
 * v1 仓库 Fork API
 * POST /api/v1/repos/[username]/[repoName]/fork - 直接 Fork 公开仓库
 */

import { NextRequest } from 'next/server';
import { success, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';
import { isUserRepoLimited } from '@/lib/user-restrictions';

// POST /api/v1/repos/[username]/[repoName]/fork - Fork 公开仓库
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

    // 查找原仓库
    const sourceRepo = await prisma.repository.findFirst({
      where: {
        owner: { username },
        name: repoName,
        deletedAt: null,
      },
      include: {
        owner: { select: { id: true, username: true } },
        _count: { select: { forks: true } },
      },
    });

    if (!sourceRepo) {
      return error(ErrorCodes.NOT_FOUND, { message: '仓库不存在' });
    }

    // 不能 Fork 自己的仓库
    if (sourceRepo.ownerId === auth.userId) {
      return errors.forbidden('不能 Fork 自己的仓库');
    }

    // 只能 Fork 公开仓库 (visibility = 1)
    if (sourceRepo.visibility !== 1) {
      return errors.forbidden('私有仓库需要申请 Fork，请使用 /fork-request');
    }

    // 检查用户限制
    const repoLimited = await isUserRepoLimited(auth.userId);
    if (repoLimited.limited) {
      const reason = repoLimited.penalty?.reason || '仓库数量已达上限';
      return errors.forbidden(`${reason}，无法 Fork`);
    }

    // 检查是否已 Fork
    const existingFork = await prisma.repository.findFirst({
      where: {
        ownerId: auth.userId,
        forkedFromId: sourceRepo.id,
        isFork: true,
        deletedAt: null,
      },
    });

    if (existingFork) {
      return error(ErrorCodes.RESOURCE_EXISTS, { message: '您已经 Fork 了这个仓库' });
    }

    // 创建 Fork 仓库
    const forkedRepo = await prisma.repository.create({
      data: {
        ownerId: auth.userId,
        name: sourceRepo.name,
        description: sourceRepo.description,
        visibility: 1, // Fork 的仓库默认为公开
        isFork: true,
        forkedFromId: sourceRepo.id,
        defaultBranch: sourceRepo.defaultBranch,
        language: sourceRepo.language,
      },
    });

    // 增加原仓库的 fork 计数
    await prisma.repository.update({
      where: { id: sourceRepo.id },
      data: { forkCount: { increment: 1 } },
    });

    return success({
      id: forkedRepo.id,
      name: forkedRepo.name,
      fullName: `${auth.username}/${forkedRepo.name}`,
      htmlUrl: `/${auth.username}/${forkedRepo.name}`,
      forkedFrom: {
        id: sourceRepo.id,
        fullName: `${sourceRepo.owner.username}/${sourceRepo.name}`,
      },
    }, '仓库 Fork 成功');
  } catch (err) {
    return handlePrismaError(err, 'Fork 操作失败');
  }
}
