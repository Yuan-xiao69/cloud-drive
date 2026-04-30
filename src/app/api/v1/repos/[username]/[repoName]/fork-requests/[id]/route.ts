export const dynamic = 'force-dynamic';
/**
 * v1 Fork 申请详情与审批 API
 * GET /api/v1/repos/[username]/[repoName]/fork-requests/[id] - 获取申请详情
 * PATCH /api/v1/repos/[username]/[repoName]/fork-requests/[id] - 审批申请
 * DELETE /api/v1/repos/[username]/[repoName]/fork-requests/[id] - 取消申请
 */

import { NextRequest } from 'next/server';
import { success, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';
import { isUserRepoLimited } from '@/lib/user-restrictions';
import { sendNotificationToUser } from '@/lib/notification-service';

// GET /api/v1/repos/[username]/[repoName]/fork-requests/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string; repoName: string; id: string }> }
): Promise<Response> {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return errors.unauthorized();
    }

    const { username, repoName, id } = await params;

    // 查找仓库
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

    // 查找申请
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

    // 权限检查：仓库所有者或申请人可以查看
    if (repo.ownerId !== auth.userId && forkRequest.requesterId !== auth.userId) {
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
  } catch (err) {
    return handlePrismaError(err, '获取申请详情失败');
  }
}

// PATCH /api/v1/repos/[username]/[repoName]/fork-requests/[id] - 审批申请
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ username: string; repoName: string; id: string }> }
): Promise<Response> {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return errors.unauthorized();
    }

    const { username, repoName, id } = await params;
    const body = await req.json();
    const { action, note } = body;

    // 查找仓库
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

    // 只有仓库所有者可以审批
    if (repo.ownerId !== auth.userId) {
      return errors.forbidden('只有仓库所有者可以审批 Fork 申请');
    }

    // 查找申请
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

    // 检查申请人是否有仓库数量限制
    if (action === 'approve') {
      const repoLimited = await isUserRepoLimited(forkRequest.requesterId);
      if (repoLimited.limited) {
        const reason = repoLimited.penalty?.reason || '仓库数量已达上限';
        return errors.forbidden(`用户 ${forkRequest.requester.username} ${reason}，无法 Fork`);
      }
    }

    // 处理审批
    if (action === 'approve') {
      // 创建 Fork
      const forkedRepo = await prisma.repository.create({
        data: {
          ownerId: forkRequest.requesterId,
          name: repo.name,
          description: repo.description,
          visibility: 1, // Fork 的仓库默认为公开
          isFork: true,
          forkedFromId: repo.id,
          defaultBranch: repo.defaultBranch,
          language: repo.language,
        },
      });

      // 更新申请状态
      await prisma.forkRequest.update({
        where: { id },
        data: {
          status: 'approved',
          processedBy: auth.userId,
          processedAt: new Date(),
          note: note || null,
        },
      });

      // 增加原仓库的 fork 计数
      await prisma.repository.update({
        where: { id: repo.id },
        data: { forkCount: { increment: 1 } },
      });

      // 发送通知
      sendNotificationToUser(forkRequest.requesterId, {
        senderId: auth.userId,
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
          fullName: `${forkRequest.requester.username}/${forkedRepo.name}`,
          htmlUrl: `/${forkRequest.requester.username}/${forkedRepo.name}`,
        },
      }, 'Fork 申请已批准');
    } else if (action === 'reject') {
      // 拒绝申请
      await prisma.forkRequest.update({
        where: { id },
        data: {
          status: 'rejected',
          processedBy: auth.userId,
          processedAt: new Date(),
          note: note || null,
        },
      });

      // 发送通知
      sendNotificationToUser(forkRequest.requesterId, {
        senderId: auth.userId,
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
  } catch (err) {
    return handlePrismaError(err, '审批 Fork 申请失败');
  }
}

// DELETE /api/v1/repos/[username]/[repoName]/fork-requests/[id] - 取消申请
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ username: string; repoName: string; id: string }> }
): Promise<Response> {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return errors.unauthorized();
    }

    const { username, repoName, id } = await params;

    // 查找仓库
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

    // 查找申请
    const forkRequest = await prisma.forkRequest.findUnique({
      where: { id },
    });

    if (!forkRequest) {
      return error(ErrorCodes.NOT_FOUND, { message: 'Fork 申请不存在' });
    }

    // 权限检查：申请人或仓库所有者可以删除
    if (forkRequest.requesterId !== auth.userId && repo.ownerId !== auth.userId) {
      return errors.forbidden('无权删除此申请');
    }

    // 只能删除 pending 状态的申请
    if (forkRequest.status !== 'pending') {
      return error(ErrorCodes.INVALID_PARAMS, { message: '只能删除待处理的申请' });
    }

    await prisma.forkRequest.delete({ where: { id } });

    return success({ id }, '申请已删除');
  } catch (err) {
    return handlePrismaError(err, '删除申请失败');
  }
}
