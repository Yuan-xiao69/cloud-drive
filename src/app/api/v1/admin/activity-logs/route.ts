export const dynamic = 'force-dynamic';
/**
 * v1 用户活动日志 API
 * GET /api/v1/admin/activity-logs - 获取用户操作日志列表
 */

import { defineRoute } from '@/lib/framework/define-route';
import { paginated, errors, parsePagination, buildPaginationMeta } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';

// GET /api/v1/admin/activity-logs - 获取用户操作日志列表
export const GET = defineRoute({
  auth: 'required',
  async handler({ req, user }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const sp = req.nextUrl.searchParams;
    const { page, size, skip } = parsePagination(sp);

    const userId = sp.get('userId');
    const action = sp.get('action');
    const targetType = sp.get('targetType');
    const status = sp.get('status');
    const startDate = sp.get('startDate');
    const endDate = sp.get('endDate');

    const where: Record<string, unknown> = {};

    if (userId) {
      where.userId = userId;
    }
    if (action) {
      where.action = action;
    }
    if (targetType) {
      where.targetType = targetType;
    }
    if (status) {
      where.status = status;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.createdAt as Record<string, unknown>).lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }

    const [logs, total] = await Promise.all([
      prisma.userActivityLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: size,
      }),
      prisma.userActivityLog.count({ where }),
    ]);

    const items = logs.map((log) => ({
      id: log.id,
      user: {
        id: log.user.id,
        username: log.user.username,
        avatarUrl: log.user.avatarUrl,
        email: log.user.email,
      },
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      targetName: log.targetName,
      details: log.details,
      fileSize: log.fileSize ? Number(log.fileSize) : null,
      ipAddress: log.ipAddress,
      status: log.status,
      errorMsg: log.errorMsg,
      createdAt: log.createdAt.toISOString(),
    }));

    const pagination = buildPaginationMeta(total, page, size);
    return paginated(items, pagination);
  },
});
