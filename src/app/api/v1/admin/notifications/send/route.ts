export const dynamic = 'force-dynamic';
/**
 * v1 发送通知 API
 * POST /api/v1/admin/notifications/send - 发送系统通知（管理员专用）
 */

import { NextRequest } from 'next/server';
import { success, created, handlePrismaError, errors } from '@/lib/api/v1';
import { requireAdmin, isAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/v1/admin/notifications/send - 发送系统通知
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const adminResult = await requireAdmin(req);
    if (isAuthError(adminResult)) {
      return adminResult.error;
    }

    const { userIds, title, content, type, linkUrl } = await req.json();

    if (!title || !content) {
      return errors.badRequest('标题和内容不能为空');
    }

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return errors.badRequest('请选择要发送的用户');
    }

    const notifications = await Promise.all(
      userIds.map((userId: string) =>
        prisma.notification.create({
          data: {
            userId,
            senderId: adminResult.userId,
            type: type || 'system',
            title,
            content,
            linkUrl: linkUrl || null
          }
        })
      )
    );

    return created({
      message: `成功发送 ${notifications.length} 条通知`,
      count: notifications.length
    });
  } catch (err) {
    console.error('发送通知失败:', err);
    return errors.internal('发送通知失败');
  }
}
