export const dynamic = 'force-dynamic';

/**
 * v1 发送警告 API
 * POST /api/v1/admin/warnings - 发送警告通知
 * GET /api/v1/admin/warnings - 获取警告历史
 */

import { NextRequest } from 'next/server';
import { success, created, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isAuthError, recordAuditLog } from '@/lib/auth';

// POST /api/v1/admin/warnings - 发送警告
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const body = await req.json();
    const { userId, reportId, reason, description } = body;

    if (!userId || !reason) {
      return errors.badRequest('缺少必填字段：userId, reason');
    }

    // 检查目标用户
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

    // 创建警告通知
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: 'warning',
        title: '系统警告通知',
        content: `您收到了一个系统警告：${reason}${description ? '\n\n详情：' + description : ''}`,
        priority: 'high',
        isRead: false,
        senderId: auth.userId,
      },
    });

    // 如果有关联举报，更新举报处理状态
    if (reportId) {
      await prisma.report.update({
        where: { id: reportId },
        data: {
          status: 'processed',
          handlerId: auth.userId,
          handledAt: new Date(),
          handlerNote: `发送警告：${reason}`,
        },
      });
    }

    // 记录审计日志
    await recordAuditLog({
      adminId: auth.userId,
      userId: auth.userId,
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
  } catch (err) {
    return handlePrismaError(err, '发送警告失败');
  }
}

// GET /api/v1/admin/warnings - 获取警告历史
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
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

    // 获取被警告用户信息
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
  } catch (err) {
    return handlePrismaError(err);
  }
}