export const dynamic = 'force-dynamic';
/**
 * v1 Fork 申请 API
 * POST /api/v1/repos/[username]/[repoName]/fork-request - 申请 Fork 私有仓库
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { defineRoute } from '@/lib/framework/define-route';
import { created, error, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/lib/api/v1';
import { isUserMuted } from '@/lib/user-restrictions';
import { sendNotificationToUser } from '@/lib/notification-service';

const forkRequestSchema = z.object({
  message: z.string().optional(),
});

// POST /api/v1/repos/[username]/[repoName]/fork-request - 创建 Fork 申请
export const POST = defineRoute({
  auth: 'required',
  validation: forkRequestSchema,
  handler: async ({ req, user, body, params }) => {
    const { username, repoName } = params;
    const { message } = body as z.infer<typeof forkRequestSchema>;

    const repo = await prisma.repository.findFirst({
      where: {
        owner: { username },
        name: repoName,
        deletedAt: null,
      },
      include: {
        owner: { select: { id: true, username: true } },
      },
    });

    if (!repo) {
      return error(ErrorCodes.NOT_FOUND, { message: '仓库不存在' });
    }

    if (repo.ownerId === user!.id) {
      return errors.forbidden('不能申请 Fork 自己的仓库');
    }

    if (repo.visibility === 1) {
      return errors.badRequest('公开仓库可以直接 Fork，请使用 /fork 接口');
    }

    const muteCheck = await isUserMuted(user!.id);
    if (muteCheck.muted && muteCheck.penalty) {
      const endStr = muteCheck.penalty.endDate
        ? `，将于 ${muteCheck.penalty.endDate.toLocaleDateString('zh-CN')} 解除`
        : '，永久禁言';
      return errors.forbidden(`您已被禁言：${muteCheck.penalty.reason}${endStr}`);
    }

    const existingRequest = await prisma.forkRequest.findFirst({
      where: {
        repoId: repo.id,
        requesterId: user!.id,
        status: 'pending',
      },
    });

    if (existingRequest) {
      return error(ErrorCodes.RESOURCE_EXISTS, { message: '您已提交过待处理的 Fork 申请，请等待审批' });
    }

    const forkRequest = await prisma.forkRequest.create({
      data: {
        repoId: repo.id,
        requesterId: user!.id,
        message: message?.trim() || '',
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      include: {
        requester: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    sendNotificationToUser(repo.ownerId, {
      senderId: user!.id,
      type: 'fork_request',
      title: '新的 Fork 申请',
      content: `${user!.username} 申请 Fork 您的仓库 ${username}/${repoName}`,
      linkUrl: `/${username}/${repoName}/settings?tab=fork-requests`,
      priority: 'normal',
    });

    return created({
      id: forkRequest.id,
      repoId: forkRequest.repoId,
      requester: {
        id: forkRequest.requester.id,
        username: forkRequest.requester.username,
        avatarUrl: forkRequest.requester.avatarUrl ?? undefined,
      },
      message: forkRequest.message,
      status: forkRequest.status,
      expiresAt: forkRequest.expiresAt?.toISOString(),
      createdAt: forkRequest.createdAt.toISOString(),
    }, 'Fork 申请已提交，请等待仓库所有者审批');
  },
});
