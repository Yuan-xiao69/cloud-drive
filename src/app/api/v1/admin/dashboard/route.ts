export const dynamic = 'force-dynamic';
/**
 * v1 管理后台仪表盘 API
 * GET /api/v1/admin/dashboard - 获取管理后台仪表盘数据
 */

import { defineRoute } from '@/lib/framework/define-route';
import { success, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { withCache } from '@/lib/cache';

async function fetchDashboardData() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers, newUsersToday, totalPublicRepos, pendingReports, recentReports,
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

  const [sevenDaysUserData, sevenDaysRepoData, sevenDaysDiscussionData] = await Promise.all([
    prisma.user.findMany({ where: { createdAt: { gte: sevenDaysAgo } }, select: { createdAt: true } }),
    prisma.repository.findMany({ where: { createdAt: { gte: sevenDaysAgo }, deletedAt: null }, select: { createdAt: true } }),
    prisma.discussion.findMany({ where: { createdAt: { gte: sevenDaysAgo }, isDeleted: false }, select: { createdAt: true } }),
  ]);

  const userTrendMap = new Map<string, number>();
  const contentTrendMap = new Map<string, { repos: number; discussions: number }>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const md = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    userTrendMap.set(md, 0);
    contentTrendMap.set(md, { repos: 0, discussions: 0 });
  }
  for (const u of sevenDaysUserData) { const md = `${String(u.createdAt.getMonth() + 1).padStart(2, '0')}-${String(u.createdAt.getDate()).padStart(2, '0')}`; userTrendMap.set(md, (userTrendMap.get(md) || 0) + 1); }
  for (const r of sevenDaysRepoData) { const md = `${String(r.createdAt.getMonth() + 1).padStart(2, '0')}-${String(r.createdAt.getDate()).padStart(2, '0')}`; const c = contentTrendMap.get(md) || { repos: 0, discussions: 0 }; contentTrendMap.set(md, { ...c, repos: c.repos + 1 }); }
  for (const d of sevenDaysDiscussionData) { const md = `${String(d.createdAt.getMonth() + 1).padStart(2, '0')}-${String(d.createdAt.getDate()).padStart(2, '0')}`; const c = contentTrendMap.get(md) || { repos: 0, discussions: 0 }; contentTrendMap.set(md, { ...c, discussions: c.discussions + 1 }); }

  const userTrend: { date: string; count: number }[] = [];
  const contentTrend: { date: string; repos: number; discussions: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const md = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    userTrend.push({ date: md, count: userTrendMap.get(md) || 0 });
    contentTrend.push({ date: md, ...(contentTrendMap.get(md) || { repos: 0, discussions: 0 }) });
  }

  return {
    totalUsers, newUsersToday, totalPublicRepos, pendingReports, userTrend, contentTrend,
    recentReports: recentReports.map((r) => ({
      id: r.id, targetType: r.targetType, targetId: r.targetId, reason: r.reason, status: r.status,
      reporterUsername: r.reporter?.username || '未知', createdAt: r.createdAt.toISOString(),
    })),
  };
}

// GET /api/v1/admin/dashboard - 获取仪表盘数据
export const GET = defineRoute({
  auth: 'required',
  async handler({ user }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const data = await withCache('admin:dashboard', 30, fetchDashboardData);
    return success(data);
  },
});
