/**
 * 举报管理服务 (ReportService)
 *
 * 封装举报创建、查询、处理、忽略、批量处理的业务逻辑，
 * 供管理后台路由调用。
 *
 * 核心功能：
 *   1. create()       — 创建举报
 *   2. list()         — 获取举报列表（分页 + 状态过滤）
 *   3. process()      — 处理举报（删除内容 / 忽略，可选处罚用户）
 *   4. ignore()       — 忽略举报（process 的便捷包装）
 *   5. batchProcess() — 批量处理举报
 *   6. getById()      — 获取举报详情（含目标信息、关联举报、举报者统计）
 *   7. getRelated()   — 获取关联举报列表
 *   8. getReporterHistory() — 获取举报者的举报历史
 *   9. getStats()     — 获取举报统计数据
 */

import { prisma } from '@/lib/prisma';
import { BusinessError } from '@/lib/framework';
import { recordAuditLog, invalidateAllTokens } from '@/lib/auth';
import {
  sendReportNotificationEmail,
  type ReportNotificationParams,
} from '@/lib/email-service';
import type { Prisma } from '@prisma/client';

// ============================================================
// 类型定义
// ============================================================

/** 合法的目标类型 */
const VALID_TARGET_TYPES = [
  'discussion',
  'comment',
  'issue',
  'pullrequest',
  'repository',
  'user',
] as const;

/** 合法的举报状态 */
const VALID_STATUSES = ['pending', 'handled', 'dismissed'] as const;

/** 合法的处罚类型 */
const VALID_PENALTY_TYPES = ['mute', 'repo_limit', 'storage_limit', 'ban'] as const;

export interface CreateReportInput {
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: string;
}

export interface ListReportsInput {
  status?: string;
  page?: number;
  size?: number;
}

export interface ProcessReportInput {
  reportId: string;
  adminId: string;
  /** 'delete' = 删除内容 → status='handled', 'dismiss' = 忽略 → status='dismissed' */
  action: 'delete' | 'dismiss';
  note?: string;
  penaltyType?: string;
  penaltyReason?: string;
  ipAddress?: string;
}

export interface BatchProcessInput {
  reportIds: string[];
  adminId: string;
  action: 'delete' | 'dismiss';
  note?: string;
  ipAddress?: string;
}

export interface ReportListItem {
  id: string;
  reporterId: string;
  reporterUsername: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: string;
  handlerId?: string;
  handlerUsername?: string;
  handlerNote?: string;
  createdAt: string;
  handledAt?: string;
}

export interface PaginatedReports {
  items: ReportListItem[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

export interface ReportDetail {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: string;
  reporter: {
    id: string;
    username: string;
    email: string;
    avatarUrl: string | null;
    createdAt: Date;
  } | null;
  reporterStats: {
    totalReports: number;
    validReports: number;
    invalidReports: number;
    validRate: number;
  };
  handler: {
    id: string;
    username: string;
  } | null;
  handlerNote: string | null;
  createdAt: string;
  handledAt: string | null;
  targetInfo: Record<string, unknown>;
  relatedReports: Array<{
    id: string;
    reason: string;
    status: string;
    createdAt: string;
  }>;
}

export interface ProcessResult {
  id: string;
  status: string;
  handlerId?: string;
  handlerNote?: string | null;
  handledAt?: string;
}

export interface BatchProcessResult {
  processed: ProcessResult[];
  errors: Array<{ reportId: string; error: string }>;
}

export interface ReportStats {
  summary: {
    total: number;
    pending: number;
    processed: number;
    dismissed: number;
    today: number;
    thisWeek: number;
    avgHandlingTimeHours: number;
  };
  byType: Array<{ type: string; count: number; percentage: number }>;
  byStatus: Array<{ status: string; count: number; percentage: number }>;
  byReason: Array<{ reason: string; count: number }>;
  recentTrend: Array<{ date: string; count: number }>;
  topReporters: Array<{
    reporterId: string;
    username?: string;
    avatarUrl?: string;
    reportCount: number;
  }>;
  mostReported: Array<{
    targetType: string;
    targetId: string;
    reportCount: number;
    name?: string;
    link?: string;
  }>;
}

// ============================================================
// ReportService
// ============================================================

export class ReportService {
  // ==========================================================
  // create — 创建举报
  // ==========================================================

  /**
   * 创建一个新的举报记录。
   *
   * 验证：
   *   1. 举报人存在且未被封禁
   *   2. targetType 在白名单内
   *   3. 举报原因非空
   *   4. 不能重复举报（同一人对同一目标只能有一个 pending 举报）
   *
   * @throws {BusinessError} 验证失败时抛出
   */
  static async create(input: CreateReportInput) {
    const { reporterId, targetType, targetId, reason } = input;

    // 校验举报人存在
    const reporter = await prisma.user.findUnique({
      where: { id: reporterId },
      select: { id: true, isBanned: true },
    });
    if (!reporter) {
      throw new BusinessError('notFound', '用户');
    }
    if (reporter.isBanned) {
      throw new BusinessError('forbidden', '您的账号已被封禁，无法进行举报');
    }

    // 校验目标类型
    if (!VALID_TARGET_TYPES.includes(targetType as typeof VALID_TARGET_TYPES[number])) {
      throw new BusinessError('INVALID_PARAMS', '无效的举报目标类型');
    }

    // 校验举报原因
    if (!reason?.trim()) {
      throw new BusinessError('INVALID_PARAMS', '举报原因不能为空');
    }

    // 检查重复举报
    const existing = await prisma.report.findFirst({
      where: {
        reporterId,
        targetType,
        targetId,
        status: 'pending',
      },
    });
    if (existing) {
      throw new BusinessError('badRequest', '您已经举报过该内容，请等待管理员处理');
    }

    const report = await prisma.report.create({
      data: {
        reporterId,
        targetType,
        targetId,
        reason: reason.trim(),
        status: 'pending',
      },
    });

    return {
      id: report.id,
      reporterId: report.reporterId,
      targetType: report.targetType,
      targetId: report.targetId,
      reason: report.reason,
      status: report.status,
      createdAt: report.createdAt.toISOString(),
    };
  }

  // ==========================================================
  // list — 获取举报列表
  // ==========================================================

  /**
   * 分页查询举报列表，支持按状态过滤。
   *
   * @param input.status - 过滤状态，可选 'pending' | 'handled' | 'dismissed'
   * @param input.page   - 页码，默认 1
   * @param input.size   - 每页条数，默认 20
   */
  static async list(input: ListReportsInput = {}): Promise<PaginatedReports> {
    const { status, page = 1, size = 20 } = input;

    const where: Prisma.ReportWhereInput = {};
    if (status && VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
      where.status = status;
    }

    const skip = (page - 1) * size;

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          reporter: { select: { id: true, username: true, avatarUrl: true } },
          handler: { select: { id: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: size,
      }),
      prisma.report.count({ where }),
    ]);

    const items: ReportListItem[] = reports.map((r) => ({
      id: r.id,
      reporterId: r.reporterId,
      reporterUsername: r.reporter?.username || '未知',
      targetType: r.targetType,
      targetId: r.targetId,
      reason: r.reason,
      status: r.status,
      handlerId: r.handlerId ?? undefined,
      handlerUsername: r.handler?.username ?? undefined,
      handlerNote: r.handlerNote ?? undefined,
      createdAt: r.createdAt.toISOString(),
      handledAt: r.handledAt?.toISOString() ?? undefined,
    }));

    return {
      items,
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  }

  // ==========================================================
  // process — 处理举报
  // ==========================================================

  /**
   * 处理举报（删除内容或忽略举报，可选处罚用户）。
   *
   * 操作流程：
   *   1. 校验管理员权限（调用方负责，此处不做角色检查）
   *   2. 查找举报记录，确认状态为 pending
   *   3. action='delete' → 根据 targetType 删除对应内容
   *   4. action='dismiss' → 直接标记为已忽略
   *   5. 更新举报状态
   *   6. 可选：处罚用户（仅 super_admin 可操作）
   *   7. 发送邮件通知
   *   8. 记录审计日志
   *
   * @throws {BusinessError} 举报不存在或已被处理时抛出
   */
  static async process(input: ProcessReportInput): Promise<ProcessResult> {
    const { reportId, adminId, action, note, penaltyType, penaltyReason, ipAddress } = input;

    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) {
      throw new BusinessError('notFound', '举报不存在');
    }
    if (report.status !== 'pending') {
      throw new BusinessError('badRequest', '该举报已被处理');
    }

    // 校验管理员权限：处罚操作需要 super_admin
    if (penaltyType) {
      const admin = await prisma.user.findUnique({
        where: { id: adminId },
        select: { role: true },
      });
      if (!admin || admin.role !== 'super_admin') {
        throw new BusinessError('forbidden', '只有超级管理员才能处罚用户');
      }
      if (!VALID_PENALTY_TYPES.includes(penaltyType as typeof VALID_PENALTY_TYPES[number])) {
        throw new BusinessError('badRequest', '无效的处罚类型');
      }
      if (!penaltyReason || penaltyReason.trim().length === 0) {
        throw new BusinessError('badRequest', '处罚原因为必填项');
      }
    }

    const now = new Date();

    // 删除目标内容
    if (action === 'delete') {
      await ReportService.deleteTargetContent(report.targetType, report.targetId);
    }

    // 更新举报状态
    const newStatus = action === 'delete' ? 'handled' : 'dismissed';

    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: {
        status: newStatus,
        handlerId: adminId,
        handlerNote: note || null,
        handledAt: now,
      },
    });

    // 处罚用户
    if (penaltyType && penaltyReason) {
      await ReportService.applyPenalty(report, adminId, penaltyType, penaltyReason);
    }

    // 发送邮件通知（异步，不阻塞）
    ReportService.sendNotifications(report, adminId, action, note, penaltyType, penaltyReason, now).catch(
      (err) => {
        console.error('发送举报通知邮件失败:', err);
      },
    );

    // 记录审计日志
    await recordAuditLog({
      adminId,
      actionType: action === 'delete' ? 'report_delete_content' : 'report_dismiss',
      targetType: report.targetType,
      targetId: report.targetId,
      details: {
        reportId: report.id,
        action,
        note: note || null,
        reporterId: report.reporterId,
      },
      ipAddress,
    });

    return {
      id: updatedReport.id,
      status: updatedReport.status,
      handlerId: updatedReport.handlerId ?? undefined,
      handlerNote: updatedReport.handlerNote,
      handledAt: updatedReport.handledAt?.toISOString(),
    };
  }

  // ==========================================================
  // ignore — 忽略举报
  // ==========================================================

  /**
   * 忽略（驳回）一条举报。是 process() 的便捷包装。
   *
   * @param reportId  - 举报 ID
   * @param adminId   - 管理员 ID
   * @param note      - 处理备注
   * @param ipAddress - 操作者 IP
   */
  static async ignore(
    reportId: string,
    adminId: string,
    note?: string,
    ipAddress?: string,
  ): Promise<ProcessResult> {
    return ReportService.process({
      reportId,
      adminId,
      action: 'dismiss',
      note,
      ipAddress,
    });
  }

  // ==========================================================
  // batchProcess — 批量处理举报
  // ==========================================================

  /**
   * 批量处理多条举报。
   *
   * 逐条处理，每条独立事务，单条失败不影响其他。
   *
   * @returns { processed: 成功列表, errors: 失败列表 }
   */
  static async batchProcess(input: BatchProcessInput): Promise<BatchProcessResult> {
    const { reportIds, adminId, action, note, ipAddress } = input;

    const processed: ProcessResult[] = [];
    const errors: Array<{ reportId: string; error: string }> = [];

    for (const reportId of reportIds) {
      try {
        const result = await ReportService.process({
          reportId,
          adminId,
          action,
          note,
          ipAddress,
        });
        processed.push(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : '未知错误';
        errors.push({ reportId, error: message });
      }
    }

    return { processed, errors };
  }

  // ==========================================================
  // getById — 获取举报详情
  // ==========================================================

  /**
   * 获取举报完整详情，包含目标信息、举报者统计和关联举报。
   */
  static async getById(id: string): Promise<ReportDetail> {
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
        handler: {
          select: { id: true, username: true },
        },
      },
    });

    if (!report) {
      throw new BusinessError('notFound', '举报记录');
    }

    // 获取目标详情
    const targetInfo = await ReportService.getTargetInfo(report.targetType, report.targetId);

    // 获取关联举报
    const relatedReports = await prisma.report.findMany({
      where: {
        targetType: report.targetType,
        targetId: report.targetId,
        id: { not: id },
      },
      select: { id: true, reason: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // 举报者统计
    const reporterStatsRaw = await prisma.report.groupBy({
      by: ['status'],
      where: { reporterId: report.reporterId },
      _count: true,
    });

    const reporterTotalReports = reporterStatsRaw.reduce((sum, s) => sum + s._count, 0);
    const reporterValidReports =
      reporterStatsRaw.find((s) => s.status === 'handled')?._count || 0;
    const reporterInvalidReports =
      reporterStatsRaw.find((s) => s.status === 'dismissed')?._count || 0;

    return {
      id: report.id,
      targetType: report.targetType,
      targetId: report.targetId,
      reason: report.reason,
      status: report.status,
      reporter: report.reporter,
      reporterStats: {
        totalReports: reporterTotalReports,
        validReports: reporterValidReports,
        invalidReports: reporterInvalidReports,
        validRate:
          reporterTotalReports > 0
            ? Math.round((reporterValidReports / reporterTotalReports) * 100)
            : 0,
      },
      handler: report.handler,
      handlerNote: report.handlerNote,
      createdAt: report.createdAt.toISOString(),
      handledAt: report.handledAt?.toISOString() || null,
      targetInfo,
      relatedReports: relatedReports.map((r) => ({
        id: r.id,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  // ==========================================================
  // getRelated — 获取关联举报
  // ==========================================================

  /**
   * 获取与指定举报目标相同的其他举报。
   */
  static async getRelated(reportId: string) {
    const currentReport = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!currentReport) {
      throw new BusinessError('notFound', '举报记录');
    }

    const relatedReports = await prisma.report.findMany({
      where: {
        targetType: currentReport.targetType,
        targetId: currentReport.targetId,
        id: { not: reportId },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: {
          select: { id: true, username: true, email: true, avatarUrl: true },
        },
        handler: {
          select: { id: true, username: true },
        },
      },
    });

    return {
      currentReport: {
        id: currentReport.id,
        targetType: currentReport.targetType,
        targetId: currentReport.targetId,
        status: currentReport.status,
        createdAt: currentReport.createdAt.toISOString(),
      },
      relatedReports: relatedReports.map((r) => ({
        id: r.id,
        reason: r.reason,
        status: r.status,
        reporter: r.reporter,
        handler: r.handler,
        createdAt: r.createdAt.toISOString(),
        handledAt: r.handledAt?.toISOString() ?? null,
      })),
      totalRelated: relatedReports.length,
    };
  }

  // ==========================================================
  // getReporterHistory — 举报者历史
  // ==========================================================

  /**
   * 获取某个举报者的完整举报历史，通过 reportId 定位举报者。
   */
  static async getReporterHistory(reportId: string) {
    const currentReport = await prisma.report.findUnique({
      where: { id: reportId },
      select: { reporterId: true },
    });

    if (!currentReport) {
      throw new BusinessError('notFound', '举报记录');
    }

    if (!currentReport.reporterId) {
      return {
        reporter: null,
        reports: [],
        stats: { total: 0, pending: 0, processed: 0, ignored: 0, validRate: 0 },
      };
    }

    const reporter = await prisma.user.findUnique({
      where: { id: currentReport.reporterId },
      select: { id: true, username: true, email: true, avatarUrl: true, createdAt: true },
    });

    const reports = await prisma.report.findMany({
      where: { reporterId: currentReport.reporterId },
      orderBy: { createdAt: 'desc' },
      include: {
        handler: { select: { id: true, username: true } },
      },
    });

    const stats = {
      total: reports.length,
      pending: reports.filter((r) => r.status === 'pending').length,
      processed: reports.filter((r) => r.status === 'handled').length,
      ignored: reports.filter((r) => r.status === 'dismissed').length,
      validRate:
        reports.length > 0
          ? Math.round(
              (reports.filter((r) => r.status === 'handled').length / reports.length) * 100,
            )
          : 0,
    };

    return {
      reporter,
      reports: reports.map((r) => ({
        id: r.id,
        targetType: r.targetType,
        targetId: r.targetId,
        reason: r.reason,
        status: r.status,
        handler: r.handler,
        createdAt: r.createdAt.toISOString(),
        handledAt: r.handledAt?.toISOString() ?? null,
      })),
      stats,
    };
  }

  // ==========================================================
  // getStats — 举报统计
  // ==========================================================

  /**
   * 获取举报统计数据，默认统计近 30 天。
   */
  static async getStats(days: number = 30): Promise<ReportStats> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // 按类型统计
    const byTypeRaw = await prisma.report.groupBy({
      by: ['targetType'],
      _count: true,
    });

    // 按状态统计
    const byStatusRaw = await prisma.report.groupBy({
      by: ['status'],
      _count: true,
    });

    // 按原因统计
    const byReasonRaw = await prisma.report.groupBy({
      by: ['reason'],
      _count: true,
      orderBy: { _count: { reason: 'desc' } },
      take: 10,
    });

    // 近期趋势
    const recentReports = await prisma.report.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true },
    });

    const trendMap = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      trendMap.set(key, 0);
    }
    recentReports.forEach((r) => {
      const key = r.createdAt.toISOString().split('T')[0];
      if (trendMap.has(key)) {
        trendMap.set(key, (trendMap.get(key) || 0) + 1);
      }
    });

    const recentTrend = Array.from(trendMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 各计数
    const pendingCount = await prisma.report.count({ where: { status: 'pending' } });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCount = await prisma.report.count({
      where: { createdAt: { gte: todayStart } },
    });

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekCount = await prisma.report.count({
      where: { createdAt: { gte: weekStart } },
    });

    // 平均处理时间
    const resolvedReports = await prisma.report.findMany({
      where: {
        status: { in: ['handled', 'dismissed'] },
        handledAt: { not: null },
        createdAt: { gte: startDate },
      },
      select: { createdAt: true, handledAt: true },
      take: 100,
    });

    let avgHandlingTime = 0;
    if (resolvedReports.length > 0) {
      const totalTime = resolvedReports.reduce((sum, r) => {
        const diff = (r.handledAt!.getTime() - r.createdAt.getTime()) / (1000 * 60 * 60);
        return sum + diff;
      }, 0);
      avgHandlingTime = Math.round((totalTime / resolvedReports.length) * 10) / 10;
    }

    // 高频举报者
    const topReportersRaw = await prisma.report.groupBy({
      by: ['reporterId'],
      _count: true,
      orderBy: { _count: { reporterId: 'desc' } },
      take: 5,
    });

    const topReporters = await Promise.all(
      topReportersRaw.map(async (r) => {
        const user = await prisma.user.findUnique({
          where: { id: r.reporterId },
          select: { id: true, username: true, avatarUrl: true },
        });
        return {
          reporterId: r.reporterId,
          username: user?.username ?? undefined,
          avatarUrl: user?.avatarUrl ?? undefined,
          reportCount: r._count,
        };
      }),
    );

    // 被举报最多的内容
    const mostReportedRaw = await prisma.report.groupBy({
      by: ['targetType', 'targetId'],
      _count: true,
      orderBy: { _count: { targetType: 'desc' } },
      take: 5,
    });

    const mostReported = await Promise.all(
      mostReportedRaw.map(async (r) => {
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
              select: { name: true, owner: { select: { username: true } } },
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
        } as ReportStats['mostReported'][number];
      }),
    );

    const totalByType = byTypeRaw.reduce((sum, x) => sum + x._count, 0);
    const totalByStatus = byStatusRaw.reduce((sum, x) => sum + x._count, 0);

    return {
      summary: {
        total:
          pendingCount +
          (byStatusRaw.find((s) => s.status === 'handled')?._count || 0) +
          (byStatusRaw.find((s) => s.status === 'dismissed')?._count || 0),
        pending: pendingCount,
        processed: byStatusRaw.find((s) => s.status === 'handled')?._count || 0,
        dismissed: byStatusRaw.find((s) => s.status === 'dismissed')?._count || 0,
        today: todayCount,
        thisWeek: weekCount,
        avgHandlingTimeHours: avgHandlingTime,
      },
      byType: byTypeRaw.map((t) => ({
        type: t.targetType,
        count: t._count,
        percentage: totalByType > 0 ? Math.round((t._count / totalByType) * 100) : 0,
      })),
      byStatus: byStatusRaw.map((s) => ({
        status: s.status,
        count: s._count,
        percentage: totalByStatus > 0 ? Math.round((s._count / totalByStatus) * 100) : 0,
      })),
      byReason: byReasonRaw.map((r) => ({
        reason: r.reason,
        count: r._count,
      })),
      recentTrend,
      topReporters,
      mostReported,
    };
  }

  // ==========================================================
  // 私有辅助方法
  // ==========================================================

  /**
   * 根据 targetType 删除目标内容（软删除或硬删除）。
   */
  private static async deleteTargetContent(
    targetType: string,
    targetId: string,
  ): Promise<void> {
    const now = new Date();

    switch (targetType) {
      case 'discussion': {
        await prisma.discussion.update({
          where: { id: targetId },
          data: { isDeleted: true },
        });
        break;
      }
      case 'comment': {
        await prisma.discussionComment.update({
          where: { id: targetId },
          data: { isDeleted: true },
        });
        break;
      }
      case 'issue': {
        await prisma.issue.delete({ where: { id: targetId } });
        break;
      }
      case 'pullrequest': {
        await prisma.pullRequest.delete({ where: { id: targetId } });
        break;
      }
      case 'repository': {
        await prisma.repository.update({
          where: { id: targetId },
          data: { deletedAt: now },
        });
        break;
      }
      case 'user': {
        // 不直接删除用户，仅标记举报已处理
        break;
      }
      default:
        throw new BusinessError('badRequest', `不支持的目标类型: ${targetType}`);
    }
  }

  /**
   * 获取举报目标内容的所有者用户 ID。
   */
  private static async getTargetUserId(
    targetType: string,
    targetId: string,
  ): Promise<string | undefined> {
    switch (targetType) {
      case 'user':
        return targetId;
      case 'discussion': {
        const disc = await prisma.discussion.findUnique({
          where: { id: targetId },
          select: { authorId: true },
        });
        return disc?.authorId;
      }
      case 'comment': {
        const comment = await prisma.discussionComment.findUnique({
          where: { id: targetId },
          select: { authorId: true },
        });
        return comment?.authorId;
      }
      case 'issue': {
        const issue = await prisma.issue.findUnique({
          where: { id: targetId },
          select: { authorId: true },
        });
        return issue?.authorId;
      }
      case 'pullrequest': {
        const pr = await prisma.pullRequest.findUnique({
          where: { id: targetId },
          select: { authorId: true },
        });
        return pr?.authorId;
      }
      case 'repository': {
        const repo = await prisma.repository.findUnique({
          where: { id: targetId },
          select: { ownerId: true },
        });
        return repo?.ownerId;
      }
      default:
        return undefined;
    }
  }

  /**
   * 对目标用户执行处罚操作。
   */
  private static async applyPenalty(
    report: { targetType: string; targetId: string; reporterId: string },
    adminId: string,
    penaltyType: string,
    penaltyReason: string,
  ): Promise<void> {
    const targetUserId = await ReportService.getTargetUserId(
      report.targetType,
      report.targetId,
    );

    if (!targetUserId) return;

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true, isSystem: true },
    });

    if (
      !targetUser ||
      targetUser.isSystem ||
      targetUser.role === 'super_admin' ||
      targetUser.id === adminId
    ) {
      return;
    }

    const expiresDays = penaltyType === 'ban' ? 0 : 7;
    const expiresAt =
      expiresDays > 0
        ? new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000)
        : null;

    await prisma.userPenalty.create({
      data: {
        userId: targetUserId,
        penaltyType,
        reason: `举报处理处罚: ${penaltyReason}`,
        isActive: true,
        expiresAt,
        appliedBy: adminId,
        value: expiresDays > 0 ? expiresDays : 0,
      },
    });

    if (penaltyType === 'ban') {
      await prisma.user.update({
        where: { id: targetUserId },
        data: { isBanned: true },
      });
      await invalidateAllTokens(targetUserId);
    }
  }

  /**
   * 发送举报处理通知邮件（异步）。
   */
  private static async sendNotifications(
    report: {
      targetType: string;
      targetId: string;
      reason: string;
      reporterId: string;
    },
    adminId: string,
    action: 'delete' | 'dismiss',
    note: string | undefined,
    penaltyType: string | undefined,
    penaltyReason: string | undefined,
    now: Date,
  ): Promise<void> {
    try {
      const targetUserId = await ReportService.getTargetUserId(
        report.targetType,
        report.targetId,
      );

      if (!targetUserId) return;

      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { email: true, username: true },
      });

      if (!targetUser?.email || !targetUser?.username) return;

      const handleTime = now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });

      // 主通知
      const notificationParams: ReportNotificationParams = {
        type: action === 'delete' ? 'content_deleted' : 'content_dismissed',
        recipientEmail: targetUser.email,
        recipientName: targetUser.username,
        reportReason: report.reason,
        handleNote: note,
        handleTime,
      };

      await sendReportNotificationEmail(notificationParams);

      // 处罚通知
      if (penaltyType && penaltyReason) {
        const penaltyParams: ReportNotificationParams = {
          type: 'user_penalized',
          recipientEmail: targetUser.email,
          recipientName: targetUser.username,
          reportReason: penaltyReason,
          penaltyType,
          handleNote: note,
          handleTime,
        };
        await sendReportNotificationEmail(penaltyParams);
      }
    } catch (emailError) {
      console.error('处理邮件通知时出错:', emailError);
    }
  }

  /**
   * 获取举报目标内容的详细信息。
   */
  private static async getTargetInfo(
    targetType: string,
    targetId: string,
  ): Promise<Record<string, unknown>> {
    switch (targetType) {
      case 'user': {
        const user = await prisma.user.findUnique({
          where: { id: targetId },
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
            role: true,
            isBanned: true,
            createdAt: true,
          },
        });
        if (!user) return {};
        return {
          username: user.username,
          email: user.email,
          avatarUrl: user.avatarUrl,
          role: user.role,
          isBanned: user.isBanned,
          createdAt: user.createdAt,
          link: `/${user.username}`,
        };
      }
      case 'discussion': {
        const discussion = await prisma.discussion.findUnique({
          where: { id: targetId },
          select: {
            id: true,
            title: true,
            content: true,
            authorId: true,
            author: { select: { id: true, username: true, avatarUrl: true } },
            isDeleted: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        if (!discussion) return {};
        return {
          title: discussion.title,
          content: discussion.content,
          authorId: discussion.authorId,
          authorUsername: discussion.author?.username,
          authorAvatar: discussion.author?.avatarUrl,
          isDeleted: discussion.isDeleted,
          createdAt: discussion.createdAt,
          updatedAt: discussion.updatedAt,
          link: `/discussions/${discussion.id}`,
        };
      }
      case 'comment': {
        const comment = await prisma.discussionComment.findUnique({
          where: { id: targetId },
          select: {
            id: true,
            content: true,
            authorId: true,
            author: { select: { id: true, username: true, avatarUrl: true } },
            discussionId: true,
            isDeleted: true,
            createdAt: true,
          },
        });
        if (!comment) return {};
        return {
          content: comment.content,
          authorId: comment.authorId,
          authorUsername: comment.author?.username,
          authorAvatar: comment.author?.avatarUrl,
          discussionId: comment.discussionId,
          isDeleted: comment.isDeleted,
          createdAt: comment.createdAt,
          link: `/discussions/${comment.discussionId}#comment-${comment.id}`,
        };
      }
      case 'issue': {
        const issue = await prisma.issue.findUnique({
          where: { id: targetId },
          include: {
            author: { select: { id: true, username: true, avatarUrl: true } },
            repository: {
              include: { owner: { select: { username: true } } },
            },
          },
        });
        if (!issue) return {};
        return {
          title: issue.title,
          content: issue.content,
          authorId: issue.authorId,
          authorUsername: issue.author?.username,
          authorAvatar: issue.author?.avatarUrl,
          repositoryId: issue.repositoryId,
          repositoryName:
            issue.repository?.owner?.username + '/' + issue.repository?.name,
          isClosed: issue.status === 'closed',
          createdAt: issue.createdAt,
          link: `/${issue.repository?.owner?.username}/${issue.repository?.name}/issues/${issue.id}`,
        };
      }
      case 'pullrequest': {
        const pr = await prisma.pullRequest.findUnique({
          where: { id: targetId },
          include: {
            author: { select: { id: true, username: true, avatarUrl: true } },
            repository: {
              include: { owner: { select: { username: true } } },
            },
            sourceRepo: {
              include: { owner: { select: { username: true } } },
            },
          },
        });
        if (!pr) return {};
        return {
          title: pr.title,
          content: pr.content,
          authorId: pr.authorId,
          authorUsername: pr.author?.username,
          authorAvatar: pr.author?.avatarUrl,
          sourceRepoId: pr.sourceRepoId,
          sourceRepoName:
            pr.sourceRepo?.owner?.username + '/' + pr.sourceRepo?.name,
          targetRepoId: pr.repositoryId,
          targetRepoName:
            pr.repository?.owner?.username + '/' + pr.repository?.name,
          sourceBranch: pr.sourceBranch,
          targetBranch: pr.targetBranch,
          isMerged: false,
          isClosed: pr.status === 'closed',
          createdAt: pr.createdAt,
          link: `/${pr.sourceRepo?.owner?.username || 'unknown'}/${pr.sourceRepo?.name || 'unknown'}/pulls/${pr.id}`,
        };
      }
      case 'repository': {
        const repo = await prisma.repository.findUnique({
          where: { id: targetId },
          include: {
            owner: { select: { id: true, username: true, avatarUrl: true } },
          },
        });
        if (!repo) return {};
        return {
          name: repo.name,
          description: repo.description,
          ownerId: repo.ownerId,
          ownerUsername: repo.owner?.username,
          ownerAvatar: repo.owner?.avatarUrl,
          visibility: repo.visibility === 1 ? 'public' : 'private',
          isArchived: repo.isArchived,
          stars: repo.starCount,
          forks: repo.forkCount,
          createdAt: repo.createdAt,
          updatedAt: repo.updatedAt,
          link: `/${repo.owner?.username}/${repo.name}`,
        };
      }
      default:
        return {};
    }
  }
}
