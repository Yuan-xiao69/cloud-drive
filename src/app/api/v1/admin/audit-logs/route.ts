export const dynamic = 'force-dynamic';
/**
 * v1 审计日志 API
 * GET /api/v1/admin/audit-logs - 获取审计日志列表
 */

import { NextRequest } from 'next/server';
import { success, paginated, handlePrismaError, errors, parsePagination, buildPaginationMeta } from '@/lib/api/v1';
import { requireAdmin, isAuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

// GET /api/v1/admin/audit-logs - 获取审计日志列表
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const sp = req.nextUrl.searchParams;
    const { page, size, skip } = parsePagination(sp);
    const adminId = sp.get('adminId') || undefined;
    const actionType = sp.get('actionType') || undefined;
    const startDate = sp.get('startDate') || undefined;
    const endDate = sp.get('endDate') || undefined;

    const where: Prisma.AdminAuditLogWhereInput = {};
    if (adminId) where.adminId = adminId;
    if (actionType) where.actionType = actionType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    let logs: Awaited<ReturnType<typeof prisma.adminAuditLog.findMany>> = [];
    let total = 0;

    try {
      const [logsResult, countResult] = await Promise.all([
        prisma.adminAuditLog.findMany({
          where,
          include: {
            admin: { select: { id: true, username: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: size,
        }),
        prisma.adminAuditLog.count({ where }),
      ]);
      logs = logsResult;
      total = countResult;
    } catch (dbError) {
      console.error('审计日志表查询失败:', dbError);
      const pagination = buildPaginationMeta(0, page, size);
      return paginated([], pagination);
    }

    const actionTypeLabels: Record<string, string> = {
      ban_user: '封禁用户',
      unban_user: '解封用户',
      delete_repo: '删除仓库',
      delete_discussion: '删除帖子',
      delete_comment: '删除评论',
      handle_report: '处理举报',
      update_user: '更新用户',
      delete_user: '删除用户',
      update_repo: '更新仓库',
      batch_delete_users: '批量删除用户',
      batch_delete_repos: '批量删除仓库',
    };

    const items = logs.map((l) => {
      let detailsText = '-';
      if (l.details) {
        const d = typeof l.details === 'object' ? (l.details as Record<string, unknown>) : {};
        const parts: string[] = [];
        if (typeof d.message === 'string' && d.message) parts.push(d.message);
        if (typeof d.username === 'string' && d.username) parts.push(`用户: ${d.username}`);
        if (typeof d.repoName === 'string' && d.repoName) parts.push(`仓库: ${d.repoName}`);
        if (typeof d.ownerUsername === 'string' && d.ownerUsername) parts.push(`归属: @${d.ownerUsername}`);
        if (typeof d.title === 'string' && d.title) parts.push(`标题: ${d.title}`);
        if (d.banned !== undefined) parts.push(d.banned ? '已封禁' : '已解封');
        if (typeof d.role === 'string' && d.role) parts.push(`角色: ${d.role}`);
        if (typeof d.reason === 'string' && d.reason) parts.push(`原因: ${d.reason}`);
        if (typeof d.count === 'number') parts.push(`数量: ${d.count}`);
        detailsText = parts.length > 0 ? parts.join(' · ') : (parts.length === 0 && Object.keys(d).length > 0 ? JSON.stringify(d) : '-');
      }
      const log = l as typeof l & { admin?: { username: string } | null };
      return {
        id: l.id,
        adminUsername: log.admin?.username || '系统',
        actionType: l.actionType,
        actionLabel: actionTypeLabels[l.actionType] || l.actionType,
        targetType: l.targetType ?? undefined,
        targetId: l.targetId ?? undefined,
        detailsText,
        ipAddress: l.ipAddress ?? undefined,
        createdAt: l.createdAt.toISOString(),
      };
    });

    const pagination = buildPaginationMeta(total, page, size);
    return paginated(items, pagination);
  } catch (err) {
    return handlePrismaError(err);
  }
}
