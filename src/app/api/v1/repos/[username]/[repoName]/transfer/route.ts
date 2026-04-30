export const dynamic = 'force-dynamic';
/**
 * v1 仓库转移 API
 * POST /api/v1/repos/[username]/[repoName]/transfer - 转移仓库所有权
 */

import { NextRequest } from 'next/server';
import { success, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';
import { recordActivityLog } from '@/lib/activity-log';
import { validateSensitiveOperation } from '@/lib/csrf';

// POST /api/v1/repos/[username]/[repoName]/transfer
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ username: string; repoName: string }> }
): Promise<Response> {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return errors.unauthorized();
    }

    // 解析请求体
    let body: { newOwnerUsername?: string; password?: string; confirmText?: string };
    try {
      body = await req.json();
    } catch {
      return errors.badRequest('无效的请求体');
    }

    const { newOwnerUsername, password, confirmText } = body;

    // 验证敏感操作
    const validation = await validateSensitiveOperation(req, 'transferOwnership', {
      password,
      confirmText,
    });

    if (!validation.valid) {
      return errors.forbidden(validation.error || '操作验证失败');
    }

    const { username, repoName } = await params;

    if (!newOwnerUsername) {
      return errors.badRequest('请指定新所有者用户名');
    }

    // 获取仓库
    const repo = await prisma.repository.findFirst({
      where: {
        owner: { username },
        name: repoName,
        deletedAt: null,
      },
      include: {
        owner: {
          select: { id: true, username: true },
        },
      },
    });

    if (!repo) {
      return error(ErrorCodes.NOT_FOUND, { message: '仓库不存在' });
    }

    // 只有仓库所有者可以转移
    if (repo.ownerId !== auth.userId) {
      return error(ErrorCodes.FORBIDDEN, { message: '只有仓库所有者可以转移仓库' });
    }

    // 不能转移给自己
    if (newOwnerUsername === username) {
      return errors.badRequest('不能将仓库转移给自己');
    }

    // 查找新所有者
    const newOwner = await prisma.user.findUnique({
      where: { username: newOwnerUsername },
      select: { id: true, username: true, isBanned: true },
    });

    if (!newOwner) {
      return error(ErrorCodes.NOT_FOUND, { message: '目标用户不存在' });
    }

    if (newOwner.isBanned) {
      return errors.forbidden('目标用户已被封禁');
    }

    // 检查新所有者是否有同名仓库
    const existingRepo = await prisma.repository.findFirst({
      where: {
        ownerId: newOwner.id,
        name: repoName,
        deletedAt: null,
      },
    });

    if (existingRepo) {
      return errors.conflict('目标用户已有同名仓库，请先重命名');
    }

    // 执行转移
    const updatedRepo = await prisma.repository.update({
      where: { id: repo.id },
      data: { ownerId: newOwner.id },
      include: {
        owner: {
          select: { id: true, username: true },
        },
      },
    });

    // 记录活动日志
    await recordActivityLog({
      userId: auth.userId,
      action: 'transfer_repo',
      targetType: 'repo',
      targetId: repo.id,
      targetName: repoName,
      details: {
        fromOwner: username,
        toOwner: newOwnerUsername,
      },
    });

    return success({
      id: updatedRepo.id,
      name: updatedRepo.name,
      owner: {
        id: updatedRepo.owner.id,
        username: updatedRepo.owner.username,
      },
      message: `仓库已成功转移给 ${newOwnerUsername}`,
    }, '仓库转移成功');
  } catch (err) {
    return handlePrismaError(err, '仓库转移失败');
  }
}
