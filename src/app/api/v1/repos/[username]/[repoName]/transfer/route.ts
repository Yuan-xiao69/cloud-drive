export const dynamic = 'force-dynamic';
/**
 * v1 仓库转移 API
 * POST /api/v1/repos/[username]/[repoName]/transfer - 转移仓库所有权
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { defineRoute } from '@/lib/framework/define-route';
import { success, error, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/lib/api/v1';
import { recordActivityLog } from '@/lib/activity-log';
import { getUserRepoRole, canManageRepo } from '@/lib/auth/repo-permission';

const transferSchema = z.object({
  newOwnerUsername: z.string().min(1, '请指定新所有者用户名'),
  password: z.string().optional(),
  confirmText: z.string().optional(),
});

// POST /api/v1/repos/[username]/[repoName]/transfer
export const POST = defineRoute({
  auth: 'required',
  validation: transferSchema,
  handler: async ({ req, user, body, params }) => {
    const { username, repoName } = params;
    const { newOwnerUsername, password, confirmText } = body as z.infer<typeof transferSchema>;

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

    const userRole = await getUserRepoRole(user!.id, repo.id);
    if (!canManageRepo(userRole)) {
      return error(ErrorCodes.FORBIDDEN, { message: '无权转移仓库' });
    }

    if (newOwnerUsername === username) {
      return errors.badRequest('不能将仓库转移给自己');
    }

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

    const updatedRepo = await prisma.repository.update({
      where: { id: repo.id },
      data: { ownerId: newOwner.id },
      include: {
        owner: {
          select: { id: true, username: true },
        },
      },
    });

    await recordActivityLog({
      userId: user!.id,
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
  },
});
