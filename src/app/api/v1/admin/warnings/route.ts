export const dynamic = 'force-dynamic';

/**
 * v1 发送警告 API
 * POST /api/v1/admin/warnings - 发送警告通知
 * GET /api/v1/admin/warnings - 获取警告历史
 */

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { success, created, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/auth';

// POST /api/v1/admin/warnings - 发送警告
export const POST = defineRoute({
  auth: 'required',
  validation: z.object({
    userId: z.string(),
    reportId: z.string().optional(),
    reason: z.string(),
    description: z.string().optional(),
  }),
  async handler({ user, body }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { userId, reportId, reason, description } = body;

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, isSystem: true },
    });

    if (!targetUser) {
      return errors.notFound('用户');
    }

    if (targetUser.isSystem) {
      return errors.forbidden('不能对系统内置用户发送警告');
    }

    // TODO: 迁移到 sendNotificationToUser 或 AsyncJob.enqueue('send_notification', {...})
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: 'warning',
        title: '系统警告通知',
        content: `您收到了一个系统警告：${reason}${description ? '\n\n详情：' + description : ''}`,
        priority: 'high',
        isRead: false,
        senderId: user!.id,
      },
    });

    if (reportId) {
      await prisma.report.update({
        where: { id: reportId },
        data: {
          status: 'processed',
          handlerId: user!.id,
          handledAt: new Date(),
          handlerNote: `发送警告：${reason}`,
        },
      });
    }

    // TODO: 将 recordAuditLog 迁移到 AsyncJob.enqueue('record_audit', {...})
    await recordAuditLog({
      adminId: user!.id,
      userId: user!.id,
      actionType: 'send_warning',
      targetType: 'warning',
      targetId: notification.id,
      details: { username: targetUser.username, reason, description },
    });

    return created({
      notification: {
        id: notification.id,
        userId,
        username: targetUser.username,
      },
    }, '警告已发送');
  },
});

// GET /api/v1/admin/warnings - 获取警告历史
export const GET = defineRoute({
  auth: 'required',
  async handler({ req, user }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: Record<string, unknown> = {
      type: 'warning',
    };

    if (userId) {
      where.userId = userId;
    }

    const [warnings, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          sender: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      }),
      prisma.notification.count({ where }),
    ]);

    const userIds = [...new Set(warnings.map(w => w.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, avatarUrl: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    const formattedWarnings = warnings.map(w => ({
      id: w.id,
      userId: w.userId,
      user: userMap.get(w.userId) || null,
      sender: w.sender,
      title: w.title,
      content: w.content,
      priority: w.priority,
      isRead: w.isRead,
      createdAt: w.createdAt,
    }));

    return success({
      items: formattedWarnings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  },
});