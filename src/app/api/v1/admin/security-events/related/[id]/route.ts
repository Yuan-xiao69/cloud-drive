export const dynamic = 'force-dynamic';

/**
 * v1 关联安全事件查询 API
 * GET /api/v1/admin/security-events/related/[id] - 获取关联安全事件
 */

import { defineRoute } from '@/lib/framework/define-route';
import { success, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';

// GET /api/v1/admin/security-events/related/[id] - 获取关联安全事件
export const GET = defineRoute({
  auth: 'required',
  async handler({ user, params }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    if (user!.role !== 'super_admin') {
      return errors.forbidden('只有超级管理员可以查看关联安全事件');
    }

    const { id } = params;

    // 获取当前事件
    const currentEvent = await prisma.securityEvent.findUnique({
      where: { id },
    });

    if (!currentEvent) {
      return errors.notFound('安全事件');
    }

    // 查找相同 IP 或相同用户的事件
    const relatedEvents = await prisma.securityEvent.findMany({
      where: {
        OR: [
          { ipAddress: currentEvent.ipAddress, id: { not: id } },
          currentEvent.userId ? { userId: currentEvent.userId, id: { not: id } } : {},
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // 按 IP 统计
    const sameIpCount = await prisma.securityEvent.count({
      where: {
        ipAddress: currentEvent.ipAddress,
      },
    });

    // 按用户统计
    let sameUserCount = 0;
    if (currentEvent.userId) {
      sameUserCount = await prisma.securityEvent.count({
        where: {
          userId: currentEvent.userId,
        },
      });
    }

    return success({
      currentEvent: {
        id: currentEvent.id,
        eventType: currentEvent.eventType,
        severity: currentEvent.severity,
        status: currentEvent.status,
        ipAddress: currentEvent.ipAddress,
        createdAt: currentEvent.createdAt,
      },
      relatedEvents: relatedEvents.map(e => ({
        id: e.id,
        eventType: e.eventType,
        severity: e.severity,
        status: e.status,
        ipAddress: e.ipAddress,
        createdAt: e.createdAt,
      })),
      stats: {
        sameIpCount,
        sameUserCount,
      },
    });
  },
});