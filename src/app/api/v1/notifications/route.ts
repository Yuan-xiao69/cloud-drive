export const dynamic = 'force-dynamic';
/**
 * v1 通知管理 API
 * GET /api/v1/notifications - 获取通知列表
 * PATCH /api/v1/notifications - 标记通知已读
 * DELETE /api/v1/notifications - 删除通知
 */

import { z } from 'zod';
import { defineRoute } from '@/lib/framework/define-route';
import {
  success,
  errors,
  getRequestId,
  parsePagination,
  buildPaginationMeta,
} from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';

interface NotificationResponse {
  id: string;
  type: string;
  title: string;
  content: string;
  linkUrl?: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  isRead: boolean;
  createdAt: string;
  sender?: {
    id: string;
    username: string;
    avatarUrl?: string;
  } | null;
}

interface NotificationListResponse {
  items: NotificationResponse[];
  pagination: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
  };
  unreadCount: number;
}

// GET /api/v1/notifications - 获取通知列表
export const GET = defineRoute({
  auth: 'required',
  handler: async ({ req, user }) => {
    const requestId = getRequestId(req);

    const { searchParams } = new URL(req.url);
    const { page, size, skip } = parsePagination(searchParams);
    const isRead = searchParams.get('isRead');
    const type = searchParams.get('type');
    const priority = searchParams.get('priority');

    const where: Record<string, unknown> = { userId: user!.id };

    if (isRead !== null && isRead !== undefined && isRead !== '') {
      where.isRead = isRead === 'true';
    }

    if (type) {
      where.type = type;
    }

    if (priority) {
      where.priority = priority;
    }

    // 优先级排序：urgent > high > normal > low
    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: [
          { priority: 'desc' }, // 高优先级在前
          { createdAt: 'desc' }, // 同优先级按时间
        ],
        skip,
        take: size,
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId: user!.id, isRead: false },
      }),
    ]);

    // 格式化返回
    const items: NotificationResponse[] = notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      content: n.content,
      linkUrl: n.linkUrl ?? undefined,
      priority: n.priority as 'urgent' | 'high' | 'normal' | 'low',
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
      sender: n.sender
        ? {
            id: n.sender.id,
            username: n.sender.username,
            avatarUrl: n.sender.avatarUrl ?? undefined,
          }
        : null,
    }));

    const pagination = buildPaginationMeta(total, page, size);

    const response: NotificationListResponse = {
      items,
      pagination,
      unreadCount,
    };

    return success(response, '获取通知列表成功');
  },
});

// PATCH /api/v1/notifications - 标记通知已读
export const PATCH = defineRoute({
  auth: 'required',
  validation: z.object({
    ids: z.array(z.string()).optional(),
    all: z.boolean().optional(),
  }),
  handler: async ({ req, user, body }) => {
    const requestId = getRequestId(req);
    const { ids, all } = body;

    if (all) {
      // 标记所有通知为已读
      await prisma.notification.updateMany({
        where: { userId: user!.id, isRead: false },
        data: { isRead: true },
      });
      return success({ updated: 'all' }, '所有通知已标记为已读');
    }

    if (ids && Array.isArray(ids) && ids.length > 0) {
      // 标记指定通知为已读
      await prisma.notification.updateMany({
        where: {
          userId: user!.id,
          id: { in: ids },
        },
        data: { isRead: true },
      });
      return success({ updated: ids.length }, `已标记 ${ids.length} 条通知为已读`);
    }

    return errors.badRequest('请提供要标记的通知ID或设置 all=true', requestId);
  },
});

// DELETE /api/v1/notifications - 删除通知
export const DELETE = defineRoute({
  auth: 'required',
  handler: async ({ req, user }) => {
    const requestId = getRequestId(req);

    const { searchParams } = new URL(req.url);
    const ids = searchParams.get('ids');

    if (ids) {
      const idArray = ids.split(',');
      await prisma.notification.deleteMany({
        where: {
          userId: user!.id,
          id: { in: idArray },
        },
      });
      return success({ deleted: idArray.length }, `已删除 ${idArray.length} 条通知`);
    }

    // 可选：支持删除所有已读通知
    const readAll = searchParams.get('readAll');
    if (readAll === 'true') {
      const result = await prisma.notification.deleteMany({
        where: { userId: user!.id, isRead: true },
      });
      return success({ deleted: result.count }, `已删除 ${result.count} 条已读通知`);
    }

    return errors.badRequest('请提供要删除的通知ID', requestId);
  },
});
