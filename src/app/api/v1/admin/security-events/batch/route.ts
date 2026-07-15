export const dynamic = 'force-dynamic';

/**
 * v1 安全事件批量操作 API
 * POST /api/v1/admin/security-events/batch - 批量操作安全事件
 */

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { success, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/auth';

// POST /api/v1/admin/security-events/batch - 批量操作
export const POST = defineRoute({
  auth: 'required',
  validation: z.object({
    action: z.enum(['resolve', 'ignore']),
    eventIds: z.array(z.string()).min(1),
    note: z.string().optional(),
  }),
  async handler({ user, body }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    if (user!.role !== 'super_admin') {
      return errors.forbidden('只有超级管理员可以批量操作安全事件');
    }

    const { action, eventIds, note } = body;

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
          resolvedBy: user!.id,
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
    // TODO: 将 recordAuditLog 迁移到 AsyncJob.enqueue('record_audit', {...})
    await recordAuditLog({
      adminId: user!.id,
      userId: user!.id,
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
  },
});