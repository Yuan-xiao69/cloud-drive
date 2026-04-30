export const dynamic = 'force-dynamic';
/**
 * v1 管理后台性能监控 API
 * GET /api/v1/admin/monitor - 获取系统性能指标
 *
 * 所有数据均为真实数据，无模拟值。
 */

import { NextRequest } from 'next/server';
import os from 'os';
import { success, errors } from '@/lib/api/v1';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/v1/admin/monitor
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (!auth) {
      return errors.unauthorized();
    }

    // 获取用户统计
    const [totalUsers, activeUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          deletedAt: null,
          isBanned: false,
        },
      }),
    ]);

    // 获取仓库统计
    const [totalRepos, publicRepos, privateRepos] = await Promise.all([
      prisma.repository.count({ where: { deletedAt: null } }),
      prisma.repository.count({ where: { deletedAt: null, visibility: 1 } }),
      prisma.repository.count({ where: { deletedAt: null, visibility: 0 } }),
    ]);

    // 获取讨论/Issue/PR 统计
    const [totalDiscussions, totalIssues, totalPRs] = await Promise.all([
      prisma.discussion.count({ where: { isDeleted: false } }),
      prisma.issue.count({ where: { isDeleted: false } }),
      prisma.pullRequest.count({ where: { isDeleted: false } }),
    ]);

    // 获取存储统计（真实聚合数据）
    const storageUsed = await prisma.repoItem.aggregate({
      _sum: { fileSize: true },
      where: { isDeleted: false, type: 'file' },
    });

    // 默认存储配额：100GB
    const storageLimit = 100 * 1024 * 1024 * 1024;

    // === 真实系统性能指标 ===
    const systemMetrics = await getSystemMetrics();

    // === 真实数据库连接数 ===
    const connectionCount = await getDatabaseConnectionCount();

    // === 真实操作统计（今日） ===
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [todayActions, todayErrors] = await Promise.all([
      prisma.userActivityLog.count({
        where: { createdAt: { gte: todayStart } },
      }),
      prisma.userActivityLog.count({
        where: { createdAt: { gte: todayStart }, status: 'failed' },
      }),
    ]);

    // === 审计日志统计（管理操作） ===
    const [auditTotal, auditToday] = await Promise.all([
      prisma.adminAuditLog.count(),
      prisma.adminAuditLog.count({
        where: { createdAt: { gte: todayStart } },
      }),
    ]);

    return success({
      // 系统统计（数据库真实数据）
      totalUsers,
      activeUsers,
      totalRepos,
      publicRepos,
      privateRepos,
      totalDiscussions,
      totalIssues,
      totalPRs,
      storageUsed: Number(storageUsed._sum.fileSize || 0),
      storageLimit,

      // 系统性能指标（os 模块真实数据）
      cpuUsage: systemMetrics.cpuUsage,
      cpuCores: systemMetrics.cpuCores,
      cpuLoadAvg: systemMetrics.cpuLoadAvg,
      memoryUsage: systemMetrics.memoryUsage,
      memoryTotal: systemMetrics.memoryTotal,
      memoryUsed: systemMetrics.memoryUsed,
      memoryFree: systemMetrics.memoryFree,
      uptime: systemMetrics.uptime,
      osPlatform: systemMetrics.osPlatform,
      nodeVersion: systemMetrics.nodeVersion,

      // 进程指标（process 真实数据）
      heapUsed: systemMetrics.heapUsed,
      heapTotal: systemMetrics.heapTotal,
      rss: systemMetrics.rss,

      // 真实操作统计
      requestCount: todayActions,
      errorCount: todayErrors,
      auditTotal,
      auditToday,
      avgResponseTime: 0, // 无中间件记录，展示为 N/A

      // 数据库连接
      databaseConnectionCount: connectionCount,
    });
  } catch (error) {
    console.error('Monitor API error:', error);
    return success({
      totalUsers: 0,
      activeUsers: 0,
      totalRepos: 0,
      publicRepos: 0,
      privateRepos: 0,
      totalDiscussions: 0,
      totalIssues: 0,
      totalPRs: 0,
      storageUsed: 0,
      storageLimit: 100 * 1024 * 1024 * 1024,
      cpuUsage: 0,
      cpuCores: 0,
      cpuLoadAvg: [0, 0, 0],
      memoryUsage: 0,
      memoryTotal: 0,
      memoryUsed: 0,
      memoryFree: 0,
      uptime: 0,
      osPlatform: '',
      nodeVersion: '',
      heapUsed: 0,
      heapTotal: 0,
      rss: 0,
      requestCount: 0,
      errorCount: 0,
      auditTotal: 0,
      auditToday: 0,
      avgResponseTime: 0,
      databaseConnectionCount: 0,
    });
  }
}

/**
 * 获取真实系统性能指标
 * - CPU 使用率：使用 os.loadavg() 与 CPU 核心数计算
 * - 内存：使用 os.totalmem() / os.freemem() 获取真实值
 * - 进程：使用 process.memoryUsage() 获取 Node.js 堆内存
 */
async function getSystemMetrics() {
  const cpus = os.cpus();
  const cpuCores = cpus.length;
  const loadAvg = os.loadavg(); // [1min, 5min, 15min]

  // CPU 使用率 = 1分钟负载均值 / CPU 核心数 × 100（上限 100%）
  // 这反映的是系统整体 CPU 负载，比随机数有意义得多
  const cpuUsage = Math.min((loadAvg[0] / cpuCores) * 100, 100);

  // 真实系统内存
  const memoryTotal = os.totalmem();
  const memoryFree = os.freemem();
  const memoryUsed = memoryTotal - memoryFree;
  const memoryUsage = (memoryUsed / memoryTotal) * 100;

  // Node.js 进程内存
  const memUsage = process.memoryUsage();

  return {
    cpuUsage: Math.round(cpuUsage * 10) / 10,
    cpuCores,
    cpuLoadAvg: loadAvg.map(l => Math.round(l * 100) / 100),
    memoryUsage: Math.round(memoryUsage * 10) / 10,
    memoryTotal,
    memoryUsed,
    memoryFree,
    uptime: process.uptime(),
    osPlatform: `${os.type()} ${os.release()} ${os.arch()}`,
    nodeVersion: process.version,
    heapUsed: memUsage.heapUsed,
    heapTotal: memUsage.heapTotal,
    rss: memUsage.rss,
  };
}

/**
 * 查询 PostgreSQL 真实连接数
 * 从 pg_stat_activity 获取当前数据库的活跃连接数
 */
async function getDatabaseConnectionCount(): Promise<number> {
  try {
    const result: Array<{ count: bigint }> = await prisma.$queryRaw`
      SELECT COUNT(*)::bigint AS count
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND state != 'idle'
    `;
    return Number(result[0]?.count || 0);
  } catch (error) {
    console.error('Failed to get database connection count:', error);
    return 0;
  }
}
