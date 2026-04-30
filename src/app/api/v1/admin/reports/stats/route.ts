export const dynamic = 'force-dynamic';

/**
 * v1 举报统计 API
 * GET /api/v1/admin/reports/stats - 获取举报统计数据
 */

import { NextRequest } from 'next/server';
import { success, handlePrismaError } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isAuthError } from '@/lib/auth';

// GET /api/v1/admin/reports/stats - 获取举报统计
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const sp = req.nextUrl.searchParams;
    const days = parseInt(sp.get('days') || '30', 10); // 默认30天

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 1. 按举报类型统计
    const byType = await prisma.report.groupBy({
      by: ['targetType'],
      _count: true,
    });

    // 2. 按状态统计
    const byStatus = await prisma.report.groupBy({
      by: ['status'],
      _count: true,
    });

    // 3. 按举报原因统计
    const byReason = await prisma.report.groupBy({
      by: ['reason'],
      _count: true,
      orderBy: { _count: { reason: 'desc' } },
      take: 10,
    });

    // 4. 近N天趋势
    const recentReports = await prisma.report.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
      },
    });

    // 按日期分组
    const trendMap = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      trendMap.set(key, 0);
    }
    recentReports.forEach(r => {
      const key = r.createdAt.toISOString().split('T')[0];
      if (trendMap.has(key)) {
        trendMap.set(key, (trendMap.get(key) || 0) + 1);
      }
    });

    const recentTrend = Array.from(trendMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 5. 待处理举报数量
    const pendingCount = await prisma.report.count({
      where: { status: 'pending' },
    });

    // 6. 今日举报数量
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCount = await prisma.report.count({
      where: { createdAt: { gte: todayStart } },
    });

    // 7. 本周举报数量
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekCount = await prisma.report.count({
      where: { createdAt: { gte: weekStart } },
    });

    // 8. 处理效率（已处理举报的平均处理时间）
    const resolvedReports = await prisma.report.findMany({
      where: {
        status: { in: ['processed', 'dismissed'] },
        handledAt: { not: null },
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
        handledAt: true,
      },
      take: 100,
    });

    let avgHandlingTime = 0;
    if (resolvedReports.length > 0) {
      const totalTime = resolvedReports.reduce((sum, r) => {
        const diff = (r.handledAt!.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60); // 小时
        return sum + diff;
      }, 0);
      avgHandlingTime = Math.round(totalTime / resolvedReports.length * 10) / 10;
    }

    // 9. 高频举报者（举报最多的用户）
    const topReporters = await prisma.report.groupBy({
      by: ['reporterId'],
      _count: true,
      orderBy: { _count: { reporterId: 'desc' } },
      take: 5,
    });

    const topReporterDetails = await Promise.all(
      topReporters.map(async (r) => {
        const user = await prisma.user.findUnique({
          where: { id: r.reporterId },
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        });
        return {
          reporterId: r.reporterId,
          username: user?.username,
          avatarUrl: user?.avatarUrl,
          reportCount: r._count,
        };
      })
    );

    // 10. 被举报最多的内容
    const mostReported = await prisma.report.groupBy({
      by: ['targetType', 'targetId'],
      _count: true,
      orderBy: { _count: { targetType: 'desc' } },
      take: 5,
    });

    const mostReportedDetails = await Promise.all(
      mostReported.map(async (r) => {
        let details: Record<string, unknown> = {};
        switch (r.targetType) {
          case 'user': {
            const user = await prisma.user.findUnique({
              where: { id: r.targetId },
              select: { username: true },
            });
            details = { name: user?.username, link: `/${user?.username}` };
            break;
          }
          case 'discussion': {
            const disc = await prisma.discussion.findUnique({
              where: { id: r.targetId },
              select: { title: true },
            });
            details = { name: disc?.title, link: `/discussions/${r.targetId}` };
            break;
          }
          case 'repository': {
            const repo = await prisma.repository.findUnique({
              where: { id: r.targetId },
              select: {
                name: true,
                owner: { select: { username: true } },
              },
            });
            details = {
              name: repo?.owner?.username + '/' + repo?.name,
              link: `/${repo?.owner?.username}/${repo?.name}`,
            };
            break;
          }
          default:
            details = { name: r.targetId };
        }
        return {
          targetType: r.targetType,
          targetId: r.targetId,
          reportCount: r._count,
          ...details,
        };
      })
    );

    return success({
      summary: {
        total: pendingCount + (byStatus.find(s => s.status === 'processed')?._count || 0) + (byStatus.find(s => s.status === 'dismissed')?._count || 0),
        pending: pendingCount,
        processed: byStatus.find(s => s.status === 'processed')?._count || 0,
        dismissed: byStatus.find(s => s.status === 'dismissed')?._count || 0,
        today: todayCount,
        thisWeek: weekCount,
        avgHandlingTimeHours: avgHandlingTime,
      },
      byType: byType.map(t => ({
        type: t.targetType,
        count: t._count,
        percentage: Math.round((t._count / (byType.reduce((sum, x) => sum + x._count, 0))) * 100),
      })),
      byStatus: byStatus.map(s => ({
        status: s.status,
        count: s._count,
        percentage: Math.round((s._count / (byStatus.reduce((sum, x) => sum + x._count, 0))) * 100),
      })),
      byReason: byReason.map(r => ({
        reason: r.reason,
        count: r._count,
      })),
      recentTrend,
      topReporters: topReporterDetails,
      mostReported: mostReportedDetails,
    });
  } catch (err) {
    return handlePrismaError(err, '获取举报统计失败');
  }
}
