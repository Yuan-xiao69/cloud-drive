export const dynamic = 'force-dynamic';
/**
 * v1 Fork 申请详情与审批 API
 * GET /api/v1/repos/[username]/[repoName]/fork-requests/[id] - 获取申请详情
 * PATCH /api/v1/repos/[username]/[repoName]/fork-requests/[id] - 审批申请
 * DELETE /api/v1/repos/[username]/[repoName]/fork-requests/[id] - 取消申请
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { defineRoute } from '@/lib/framework/define-route';
import { success, error, errors } from '@/lib/api/v1';
import type { ErrorCodeString } from '@/lib/api/v1/response';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/lib/api/v1';
import { isUserRepoLimited } from '@/lib/user-restrictions';
import { sendNotificationToUser } from '@/lib/notification-service';
import { RepoService } from '@/services/repo-service';
import { BusinessError } from '@/lib/framework';

// GET /api/v1/repos/[username]/[repoName]/fork-requests/[id]
export const GET = defineRoute({
  auth: 'required',
  handler: async ({ user, params }) => {
    const { username, repoName, id } = params;

    const repo = await prisma.repository.findFirst({
      where: {
        owner: { username },
        name: repoName,
        deletedAt: null,
      },
      select: { id: true, ownerId: true },
    });

    if (!repo) {
      return error(ErrorCodes.NOT_FOUND, { message: '仓库不存在' });
    }

    const forkRequest = await prisma.forkRequest.findUnique({
      where: { id },
      include: {
        repo: {
          select: { id: true, name: true, owner: { select: { id: true, username: true } } },
        },
        requester: {
          select: { id: true, username: true, avatarUrl: true, email: true },
        },
        processor: {
          select: { id: true, username: true },
        },
      },
    });

    if (!forkRequest) {
      return error(ErrorCodes.NOT_FOUND, { message: 'Fork 申请不存在' });
    }

    if (repo.ownerId !== user!.id && forkRequest.requesterId !== user!.id) {
      return errors.forbidden('无权查看此申请');
    }

    return success({
      id: forkRequest.id,
      repo: {
        id: forkRequest.repo.id,
        name: forkRequest.repo.name,
        owner: forkRequest.repo.owner,
      },
      requester: {
        id: forkRequest.requester.id,
        username: forkRequest.requester.username,
        avatarUrl: forkRequest.requester.avatarUrl ?? undefined,
      },
      message: forkRequest.message,
      status: forkRequest.status,
      note: forkRequest.note,
      processedBy: forkRequest.processor ? {
        id: forkRequest.processor.id,
        username: forkRequest.processor.username,
      } : null,
      processedAt: forkRequest.processedAt?.toISOString() ?? null,
      expiresAt: forkRequest.expiresAt?.toISOString() ?? null,
      createdAt: forkRequest.createdAt.toISOString(),
      updatedAt: forkRequest.updatedAt.toISOString(),
    });
  },
});

const approveSchema = z.object({
  action: z.string().min(1),
  note: z.string().optional(),
});

// PATCH /api/v1/repos/[username]/[repoName]/fork-requests/[id] - 审批申请
export const PATCH = defineRoute({
  auth: 'required',
  validation: approveSchema,
  handler: async ({ req, user, body, params }) => {
    const { username, repoName, id } = params;
    const { action, note } = body as z.infer<typeof approveSchema>;

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

    if (repo.ownerId !== user!.id) {
      return errors.forbidden('只有仓库所有者可以审批 Fork 申请');
    }

    const forkRequest = await prisma.forkRequest.findUnique({
      where: { id },
      include: {
        requester: { select: { id: true, username: true } },
      },
    });

    if (!forkRequest) {
      return error(ErrorCodes.NOT_FOUND, { message: 'Fork 申请不存在' });
    }

    if (forkRequest.repoId !== repo.id) {
      return error(ErrorCodes.INVALID_PARAMS, { message: '申请与仓库不匹配' });
    }

    if (forkRequest.status !== 'pending') {
      return error(ErrorCodes.INVALID_PARAMS, { message: '申请已被处理，无法再次审批' });
    }

    if (action === 'approve') {
      const repoLimited = await isUserRepoLimited(forkRequest.requesterId);
      if (repoLimited.limited) {
        const reason = repoLimited.penalty?.reason || '仓库数量已达上限';
        return errors.forbidden(`用户 ${forkRequest.requester.username} ${reason}，无法 Fork`);
      }
    }

    if (action === 'approve') {
      const forkedRepo = await RepoService.fork({
        sourceUsername: username,
        sourceRepoName: repoName,
        userId: forkRequest.requesterId,
        username: forkRequest.requester.username,
      });

      await prisma.forkRequest.update({
        where: { id },
        data: {
          status: 'approved',
          processedBy: user!.id,
          processedAt: new Date(),
          note: note || null,
        },
      });

      sendNotificationToUser(forkRequest.requesterId, {
        senderId: user!.id,
        type: 'fork_approved',
        title: 'Fork 申请已批准',
        content: `您的 Fork 申请已获批准，仓库 ${repo.name} 已成功 Fork`,
        linkUrl: `/${forkRequest.requester.username}/${repo.name}`,
        priority: 'normal',
      });

      return success({
        requestId: forkRequest.id,
        status: 'approved',
        forkedRepo: {
          id: forkedRepo.id,
          name: forkedRepo.name,
          fullName: forkedRepo.fullName,
          htmlUrl: `/${forkedRepo.fullName}`,
        },
      }, 'Fork 申请已批准');
    } else if (action === 'reject') {
      await prisma.forkRequest.update({
        where: { id },
        data: {
          status: 'rejected',
          processedBy: user!.id,
          processedAt: new Date(),
          note: note || null,
        },
      });

      sendNotificationToUser(forkRequest.requesterId, {
        senderId: user!.id,
        type: 'fork_rejected',
        title: 'Fork 申请被拒绝',
        content: `您的 Fork 申请被拒绝：${note || '无备注'}`,
        linkUrl: `/${repo.owner.username}/${repo.name}`,
        priority: 'normal',
      });

      return success({
        requestId: forkRequest.id,
        status: 'rejected',
      }, 'Fork 申请已拒绝');
    } else {
      return error(ErrorCodes.INVALID_PARAMS, { message: 'action 必须是 approve 或 reject' });
    }
  },
});

// DELETE /api/v1/repos/[username]/[repoName]/fork-requests/[id] - 取消申请
export const DELETE = defineRoute({
  auth: 'required',
  handler: async ({ user, params }) => {
    const { username, repoName, id } = params;

    const repo = await prisma.repository.findFirst({
      where: {
        owner: { username },
        name: repoName,
        deletedAt: null,
      },
      select: { id: true, ownerId: true },
    });

    if (!repo) {
      return error(ErrorCodes.NOT_FOUND, { message: '仓库不存在' });
    }

    const forkRequest = await prisma.forkRequest.findUnique({
      where: { id },
    });

    if (!forkRequest) {
      return error(ErrorCodes.NOT_FOUND, { message: 'Fork 申请不存在' });
    }

    if (forkRequest.requesterId !== user!.id && repo.ownerId !== user!.id) {
      return errors.forbidden('无权删除此申请');
    }

    if (forkRequest.status !== 'pending') {
      return error(ErrorCodes.INVALID_PARAMS, { message: '只能删除待处理的申请' });
    }

    await prisma.forkRequest.delete({ where: { id } });

    return success({ id }, '申请已删除');
  },
});
