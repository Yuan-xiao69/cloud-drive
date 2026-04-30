export const dynamic = 'force-dynamic';
/**
 * v1 管理后台仪表盘 API
 * GET /api/v1/admin/dashboard - 获取管理后台仪表盘数据
 */

import { NextRequest } from 'next/server';
import { success, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isAuthError } from '@/lib/auth';

// GET /api/v1/admin/dashboard - 获取仪表盘数据
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsersToday,
      totalPublicRepos,
      pendingReports,
      recentReports,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.repository.count({ where: { visibility: 1, deletedAt: null } }),
      prisma.report.count({ where: { status: 'pending' } }),
      prisma.report.findMany({
        where: { status: 'pending' },
        include: { reporter: { select: { id: true, username: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    // 优化：使用单次查询获取近7天所有数据，然后在内存中聚合
    const [sevenDaysUserData, sevenDaysRepoData, sevenDaysDiscussionData] = await Promise.all([
      prisma.user.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true },
      }),
      prisma.repository.findMany({
        where: { createdAt: { gte: sevenDaysAgo }, deletedAt: null },
        select: { createdAt: true },
      }),
      prisma.discussion.findMany({
        where: { createdAt: { gte: sevenDaysAgo }, isDeleted: false },
        select: { createdAt: true },
      }),
    ]);

    // 初始化近7天趋势数据
    const userTrendMap = new Map<string, number>();
    const contentTrendMap = new Map<string, { repos: number; discussions: number }>();

    for (let i = 6; i >= 0; i--) {
      const day = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const monthDay = `${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
      userTrendMap.set(monthDay, 0);
      contentTrendMap.set(monthDay, { repos: 0, discussions: 0 });
    }

    // 聚合用户数据
    for (const user of sevenDaysUserData) {
      const monthDay = `${String(user.createdAt.getMonth() + 1).padStart(2, '0')}-${String(user.createdAt.getDate()).padStart(2, '0')}`;
      userTrendMap.set(monthDay, (userTrendMap.get(monthDay) || 0) + 1);
    }

    // 聚合仓库数据
    for (const repo of sevenDaysRepoData) {
      const monthDay = `${String(repo.createdAt.getMonth() + 1).padStart(2, '0')}-${String(repo.createdAt.getDate()).padStart(2, '0')}`;
      const current = contentTrendMap.get(monthDay) || { repos: 0, discussions: 0 };
      contentTrendMap.set(monthDay, { ...current, repos: current.repos + 1 });
    }

    // 聚合讨论数据
    for (const discussion of sevenDaysDiscussionData) {
      const monthDay = `${String(discussion.createdAt.getMonth() + 1).padStart(2, '0')}-${String(discussion.createdAt.getDate()).padStart(2, '0')}`;
      const current = contentTrendMap.get(monthDay) || { repos: 0, discussions: 0 };
      contentTrendMap.set(monthDay, { ...current, discussions: current.discussions + 1 });
    }

    // 构建最终数组
    const userTrend: { date: string; count: number }[] = [];
    const contentTrend: { date: string; repos: number; discussions: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const day = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const monthDay = `${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
      userTrend.push({ date: monthDay, count: userTrendMap.get(monthDay) || 0 });
      contentTrend.push({ date: monthDay, ...(contentTrendMap.get(monthDay) || { repos: 0, discussions: 0 }) });
    }

    return success({
      totalUsers,
      newUsersToday,
      totalPublicRepos,
      pendingReports,
      userTrend,
      contentTrend,
      recentReports: recentReports.map((r) => ({
        id: r.id,
        targetType: r.targetType,
        targetId: r.targetId,
        reason: r.reason,
        status: r.status,
        reporterUsername: r.reporter?.username || '未知',
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return handlePrismaError(err);
  }
}
