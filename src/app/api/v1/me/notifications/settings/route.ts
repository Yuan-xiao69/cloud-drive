export const dynamic = 'force-dynamic';
/**
 * API v1 - 通知设置 API
 * GET /api/v1/me/notifications/settings - 获取当前用户的通知设置
 * PATCH /api/v1/me/notifications/settings - 更新通知设置
 */

import { NextRequest } from 'next/server';
import { success, error, handlePrismaError } from '@/lib/api/v1';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        notifyWatch: true,
        notifyReply: true,
      },
    });

    if (!user) {
      return error('NOT_FOUND', { message: '用户不存在' });
    }

    return success({
      notifyWatch: user.notifyWatch,
      notifyReply: user.notifyReply,
    });
  } catch (err) {
    return handlePrismaError(err, '获取通知设置失败');
  }
}

export async function PATCH(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;

    const body = await req.json();
    const { notifyWatch, notifyReply } = body;

    // 至少要有一个更新字段
    if (typeof notifyWatch !== 'boolean' && typeof notifyReply !== 'boolean') {
      return error('VALIDATION_ERROR', { message: '至少需要提供一个有效的设置字段' });
    }

    const updateData: Record<string, boolean> = {};
    if (typeof notifyWatch === 'boolean') {
      updateData.notifyWatch = notifyWatch;
    }
    if (typeof notifyReply === 'boolean') {
      updateData.notifyReply = notifyReply;
    }

    const user = await prisma.user.update({
      where: { id: auth.userId },
      data: updateData,
      select: {
        notifyWatch: true,
        notifyReply: true,
      },
    });

    return success({
      notifyWatch: user.notifyWatch,
      notifyReply: user.notifyReply,
    }, '通知设置已更新');
  } catch (err) {
    return handlePrismaError(err, '更新通知设置失败');
  }
}
