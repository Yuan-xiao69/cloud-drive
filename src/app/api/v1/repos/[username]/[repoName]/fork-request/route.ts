export const dynamic = 'force-dynamic';
/**
 * v1 Fork 申请 API
 * POST /api/v1/repos/[username]/[repoName]/fork-request - 申请 Fork 私有仓库
 */

import { NextRequest } from 'next/server';
import { success, created, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';
import { isUserMuted } from '@/lib/user-restrictions';
import { sendNotificationToUser } from '@/lib/notification-service';

// POST /api/v1/repos/[username]/[repoName]/fork-request - 创建 Fork 申请
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

    // 查找目标仓库
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

    // 不能申请 Fork 自己的仓库
    if (repo.ownerId === auth.userId) {
      return errors.forbidden('不能申请 Fork 自己的仓库');
    }

    // 公开仓库直接 Fork，不需要申请
    if (repo.visibility === 1) {
      return errors.badRequest('公开仓库可以直接 Fork，请使用 /fork 接口');
    }

    // 检查用户是否被禁言
    const muteCheck = await isUserMuted(auth.userId);
    if (muteCheck.muted && muteCheck.penalty) {
      const endStr = muteCheck.penalty.endDate
        ? `，将于 ${muteCheck.penalty.endDate.toLocaleDateString('zh-CN')} 解除`
        : '，永久禁言';
      return errors.forbidden(`您已被禁言：${muteCheck.penalty.reason}${endStr}`);
    }

    // 检查是否已有待处理的申请
    const existingRequest = await prisma.forkRequest.findFirst({
      where: {
        repoId: repo.id,
        requesterId: auth.userId,
        status: 'pending',
      },
    });

    if (existingRequest) {
      return error(ErrorCodes.RESOURCE_EXISTS, { message: '您已提交过待处理的 Fork 申请，请等待审批' });
    }

    const body = await req.json().catch(() => ({}));
    const message = body.message?.trim() || '';

    // 创建 Fork 申请
    const forkRequest = await prisma.forkRequest.create({
      data: {
        repoId: repo.id,
        requesterId: auth.userId,
        message,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 天过期
      },
      include: {
        requester: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    // 发送通知给仓库所有者
    sendNotificationToUser(repo.ownerId, {
      senderId: auth.userId,
      type: 'fork_request',
      title: '新的 Fork 申请',
      content: `${auth.username} 申请 Fork 您的仓库 ${username}/${repoName}`,
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
  } catch (err) {
    return handlePrismaError(err, '提交 Fork 申请失败');
  }
}
