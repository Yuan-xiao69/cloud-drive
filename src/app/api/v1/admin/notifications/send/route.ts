export const dynamic = 'force-dynamic';
/**
 * v1 发送通知 API
 * POST /api/v1/admin/notifications/send - 发送系统通知（管理员专用）
 */

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { created, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';

// POST /api/v1/admin/notifications/send - 发送系统通知
export const POST = defineRoute({
  auth: 'required',
  validation: z.object({
    userIds: z.array(z.string()).min(1),
    title: z.string().min(1),
    content: z.string().min(1),
    type: z.string().optional().default('system'),
    linkUrl: z.string().nullable().optional(),
  }),
  async handler({ user, body }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { userIds, title, content, type, linkUrl } = body;

    // TODO: 迁移到 sendNotificationToUsers 或 AsyncJob.enqueue('send_notification', {...})
    const notifications = await Promise.all(
      userIds.map((userId: string) =>
        prisma.notification.create({
          data: {
            userId,
            senderId: user!.id,
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
  },
});
