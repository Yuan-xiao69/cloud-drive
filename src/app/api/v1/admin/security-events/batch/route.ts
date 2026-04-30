export const dynamic = 'force-dynamic';

/**
 * v1 安全事件批量操作 API
 * POST /api/v1/admin/security-events/batch - 批量操作安全事件
 */

import { NextRequest } from 'next/server';
import { success, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isAuthError, recordAuditLog } from '@/lib/auth';

// POST /api/v1/admin/security-events/batch - 批量操作
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    // 只有超级管理员可以操作安全事件
    if (auth.role !== 'super_admin') {
      return errors.forbidden('只有超级管理员可以批量操作安全事件');
    }

    const body = await req.json();
    const { action, eventIds, note } = body;

    if (!action || !eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
      return errors.badRequest('缺少必填参数：action, eventIds');
    }

    // 获取事件记录
    const events = await prisma.securityEvent.findMany({
      where: { id: { in: eventIds } },
      select: { id: true, eventType: true, ipAddress: true },
    });

    if (events.length === 0) {
      return errors.notFound('未找到匹配的安全事件');
    }

    let updateData: Record<string, unknown> = {};
    let logAction = '';
    let logDetail = '';

    switch (action) {
      case 'resolve':
        updateData = {
          status: 'resolved',
          resolvedAt: new Date(),
          resolvedBy: auth.userId,
        };
        logAction = 'batch_resolve_security_event';
        logDetail = `批量将 ${events.length} 个安全事件标记为已解决`;
        break;

      case 'ignore':
        updateData = { status: 'false_positive' };
        logAction = 'batch_ignore_security_event';
        logDetail = `批量将 ${events.length} 个安全事件标记为误报${note ? `，原因：${note}` : ''}`;
        break;

      default:
        return errors.badRequest('无效的操作类型');
    }

    // 执行批量更新
    await prisma.securityEvent.updateMany({
      where: { id: { in: eventIds } },
      data: updateData,
    });

    // 记录审计日志
    await recordAuditLog({
      adminId: auth.userId,
      userId: auth.userId,
      actionType: logAction,
      targetType: 'security_event',
      targetId: eventIds.join(','),
      details: { message: logDetail },
    });

    return success({
      total: events.length,
      action,
      ids: eventIds,
    }, `批量操作成功：${logDetail}`);
  } catch (err) {
    return handlePrismaError(err, '批量操作失败');
  }
}