export const dynamic = 'force-dynamic';
/**
 * v1 仓库锁定 API
 * POST /api/v1/repos/[username]/[repoName]/lock - 锁定/解锁仓库
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { defineRoute } from '@/lib/framework/define-route';
import { success, error, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/lib/api/v1';
import { recordActivityLog } from '@/lib/activity-log';
import { getUserRepoRole, canManageRepo } from '@/lib/auth/repo-permission';

const lockSchema = z.object({
  lock: z.boolean(),
  reason: z.string().optional(),
});

// POST /api/v1/repos/[username]/[repoName]/lock
export const POST = defineRoute({
  auth: 'required',
  validation: lockSchema,
  handler: async ({ user, body, params }) => {
    const { username, repoName } = params;
    const { lock, reason } = body as z.infer<typeof lockSchema>;

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

    const userRole = await getUserRepoRole(user!.id, repo.id);
    if (!canManageRepo(userRole)) {
      return error(ErrorCodes.FORBIDDEN, { message: '无权锁定仓库' });
    }

    const updatedRepo = await prisma.repository.update({
      where: { id: repo.id },
      data: { isLocked: lock },
      select: { id: true, name: true, isLocked: true },
    });

    await recordActivityLog({
      userId: user!.id,
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
  },
});
