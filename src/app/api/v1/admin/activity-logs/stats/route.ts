export const dynamic = 'force-dynamic';
/**
 * v1 活动日志统计 API
 * GET /api/v1/admin/activity-logs/stats - 获取日志统计
 */

import { defineRoute } from '@/lib/framework/define-route';
import { success, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';

// GET /api/v1/admin/activity-logs/stats - 获取日志统计
export const GET = defineRoute({
  auth: 'required',
  async handler({ req, user }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const sp = req.nextUrl.searchParams;
    const rawDays = parseInt(sp.get('days') || '7', 10);
    const days = isNaN(rawDays) || rawDays < 1 ? 7 : Math.min(rawDays, 365);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      totalLogs,
      todayLogs,
      actionStats,
      topUsers,
      recentActivity,
    ] = await Promise.all([
      prisma.userActivityLog.count(),
      prisma.userActivityLog.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.userActivityLog.groupBy({
        by: ['action'],
        where: {
          createdAt: { gte: startDate },
        },
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),
      prisma.userActivityLog.groupBy({
        by: ['userId'],
        where: {
          createdAt: { gte: startDate },
        },
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      }),
      prisma.$queryRaw<Array<{ hour: string; count: bigint }>>`
        SELECT
          DATE_TRUNC('hour', created_at) as hour,
          COUNT(*) as count
        FROM "UserActivityLog"
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY DATE_TRUNC('hour', created_at)
        ORDER BY hour ASC
      `,
    ]);

    const topUserIds = topUsers.map((u) => u.userId);
    const topUserDetails = await prisma.user.findMany({
      where: { id: { in: topUserIds } },
      select: { id: true, username: true, avatarUrl: true },
    });

    const topUsersWithDetails = topUsers.map((u) => {
      const userDetail = topUserDetails.find((d) => d.id === u.userId);
      return {
        userId: u.userId,
        username: userDetail?.username || 'Unknown',
        avatarUrl: userDetail?.avatarUrl,
        count: u._count.userId,
      };
    });

    return success({
      summary: {
        totalLogs,
        todayLogs,
        period: `${days}天内`,
      },
      actionStats: actionStats.map((s) => ({
        action: s.action,
        count: s._count.action,
      })),
      topUsers: topUsersWithDetails,
      hourlyStats: recentActivity.map((h) => ({
        hour: h.hour,
        count: Number(h.count),
      })),
    });
  },
});