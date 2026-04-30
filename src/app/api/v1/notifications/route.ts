export const dynamic = 'force-dynamic';
/**
 * v1 通知管理 API
 * GET /api/v1/notifications - 获取通知列表
 * PATCH /api/v1/notifications - 标记通知已读
 * DELETE /api/v1/notifications - 删除通知
 */

import { NextRequest } from 'next/server';
import {
  success,
  paginated,
  errors,
  getRequestId,
  parsePagination,
  buildPaginationMeta,
} from '@/lib/api/v1';
import { getAuthUser } from '@/lib/auth';
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
export async function GET(req: NextRequest): Promise<Response> {
  const requestId = getRequestId(req);

  try {
    const auth = await getAuthUser(req);
    if (!auth) return errors.unauthorized('请先登录', requestId);

    const { searchParams } = new URL(req.url);
    const { page, size, skip } = parsePagination(searchParams);
    const isRead = searchParams.get('isRead');
    const type = searchParams.get('type');
    const priority = searchParams.get('priority');

    const where: Record<string, unknown> = { userId: auth.userId };

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
        where: { userId: auth.userId, isRead: false },
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
  } catch (error) {
    console.error('[v1/notifications] GET Error:', error);
    return errors.internal('获取通知列表失败', requestId);
  }
}

// PATCH /api/v1/notifications - 标记通知已读
export async function PATCH(req: NextRequest): Promise<Response> {
  const requestId = getRequestId(req);

  try {
    const auth = await getAuthUser(req);
    if (!auth) return errors.unauthorized('请先登录', requestId);

    const body = await req.json();
    const { ids, all } = body;

    if (all) {
      // 标记所有通知为已读
      await prisma.notification.updateMany({
        where: { userId: auth.userId, isRead: false },
        data: { isRead: true },
      });
      return success({ updated: 'all' }, '所有通知已标记为已读');
    }

    if (ids && Array.isArray(ids) && ids.length > 0) {
      // 标记指定通知为已读
      await prisma.notification.updateMany({
        where: {
          userId: auth.userId,
          id: { in: ids },
        },
        data: { isRead: true },
      });
      return success({ updated: ids.length }, `已标记 ${ids.length} 条通知为已读`);
    }

    return errors.badRequest('请提供要标记的通知ID或设置 all=true', requestId);
  } catch (error) {
    console.error('[v1/notifications] PATCH Error:', error);
    return errors.internal('标记已读失败', requestId);
  }
}

// DELETE /api/v1/notifications - 删除通知
export async function DELETE(req: NextRequest): Promise<Response> {
  const requestId = getRequestId(req);

  try {
    const auth = await getAuthUser(req);
    if (!auth) return errors.unauthorized('请先登录', requestId);

    const { searchParams } = new URL(req.url);
    const ids = searchParams.get('ids');

    if (ids) {
      const idArray = ids.split(',');
      await prisma.notification.deleteMany({
        where: {
          userId: auth.userId,
          id: { in: idArray },
        },
      });
      return success({ deleted: idArray.length }, `已删除 ${idArray.length} 条通知`);
    }

    // 可选：支持删除所有已读通知
    const readAll = searchParams.get('readAll');
    if (readAll === 'true') {
      const result = await prisma.notification.deleteMany({
        where: { userId: auth.userId, isRead: true },
      });
      return success({ deleted: result.count }, `已删除 ${result.count} 条已读通知`);
    }

    return errors.badRequest('请提供要删除的通知ID', requestId);
  } catch (error) {
    console.error('[v1/notifications] DELETE Error:', error);
    return errors.internal('删除通知失败', requestId);
  }
}
