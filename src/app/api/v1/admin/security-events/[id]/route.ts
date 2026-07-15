export const dynamic = 'force-dynamic';

/**
 * v1 安全事件操作 API
 * GET /api/v1/admin/security-events/[id] - 获取事件详情
 * PATCH /api/v1/admin/security-events/[id] - 更新事件状态
 */

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { success, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/auth';

// GET /api/v1/admin/security-events/[id] - 获取事件详情
export const GET = defineRoute({
  auth: 'required',
  async handler({ user, params }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    if (user!.role !== 'super_admin') {
      return errors.forbidden('只有超级管理员可以访问安全事件详情');
    }

    const { id } = params;

    const event = await prisma.securityEvent.findUnique({
      where: { id },
    });

    if (!event) {
      return errors.notFound('安全事件');
    }

    return success({ event });
  },
});

// PATCH /api/v1/admin/security-events/[id] - 更新事件状态
export const PATCH = defineRoute({
  auth: 'required',
  validation: z.object({
    action: z.enum(['resolve', 'investigate', 'ignore']),
    note: z.string().optional(),
  }),
  async handler({ user, body, params }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    if (user!.role !== 'super_admin') {
      return errors.forbidden('只有超级管理员可以操作安全事件');
    }

    const { id } = params;
    const { action, note } = body;

    const event = await prisma.securityEvent.findUnique({
      where: { id },
    });

    if (!event) {
      return errors.notFound('安全事件');
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
        logAction = 'resolve_security_event';
        logDetail = `将安全事件标记为已解决: ${event.eventType} - ${event.ipAddress}`;
        break;

      case 'investigate':
        updateData = { status: 'investigated' };
        logAction = 'investigate_security_event';
        logDetail = `将安全事件标记为调查中: ${event.eventType} - ${event.ipAddress}`;
        break;

      case 'ignore':
        updateData = { status: 'false_positive' };
        logAction = 'ignore_security_event';
        logDetail = `将安全事件标记为误报: ${event.eventType} - ${event.ipAddress}${note ? `，原因：${note}` : ''}`;
        break;
    }

    await prisma.securityEvent.update({
      where: { id },
      data: updateData,
    });

    // TODO: 将 recordAuditLog 迁移到 AsyncJob.enqueue('record_audit', {...})
    await recordAuditLog({
      adminId: user!.id,
      userId: user!.id,
      actionType: logAction,
      targetType: 'security_event',
      targetId: id,
      details: { message: logDetail },
    });

    return success({ id, status: updateData.status }, '操作成功');
  },
});