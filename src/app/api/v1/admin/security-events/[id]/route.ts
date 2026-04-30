export const dynamic = 'force-dynamic';

/**
 * v1 安全事件操作 API
 * GET /api/v1/admin/security-events/[id] - 获取事件详情
 * PATCH /api/v1/admin/security-events/[id] - 更新事件状态
 */

import { NextRequest } from 'next/server';
import { success, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isAuthError, recordAuditLog } from '@/lib/auth';

// GET /api/v1/admin/security-events/[id] - 获取事件详情
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    if (auth.role !== 'super_admin') {
      return errors.forbidden('只有超级管理员可以访问安全事件详情');
    }

    const { id } = await params;

    const event = await prisma.securityEvent.findUnique({
      where: { id },
    });

    if (!event) {
      return errors.notFound('安全事件');
    }

    return success({ event });
  } catch (err) {
    return handlePrismaError(err);
  }
}

// PATCH /api/v1/admin/security-events/[id] - 更新事件状态
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    // 只有超级管理员可以操作安全事件
    if (auth.role !== 'super_admin') {
      return errors.forbidden('只有超级管理员可以操作安全事件');
    }

    const { id } = await params;
    const body = await req.json();
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
        // 标记为已解决
        updateData = {
          status: 'resolved',
          resolvedAt: new Date(),
          resolvedBy: auth.userId,
        };
        logAction = 'resolve_security_event';
        logDetail = `将安全事件标记为已解决: ${event.eventType} - ${event.ipAddress}`;
        break;

      case 'investigate':
        // 标记为调查中
        updateData = { status: 'investigated' };
        logAction = 'investigate_security_event';
        logDetail = `将安全事件标记为调查中: ${event.eventType} - ${event.ipAddress}`;
        break;

      case 'ignore':
        // 标记为误报
        updateData = { status: 'false_positive' };
        logAction = 'ignore_security_event';
        logDetail = `将安全事件标记为误报: ${event.eventType} - ${event.ipAddress}${note ? `，原因：${note}` : ''}`;
        break;

      default:
        return errors.badRequest('无效的操作类型');
    }

    await prisma.securityEvent.update({
      where: { id },
      data: updateData,
    });

    await recordAuditLog({
      adminId: auth.userId,
      userId: auth.userId,
      actionType: logAction,
      targetType: 'security_event',
      targetId: id,
      details: { message: logDetail },
    });

    return success({ id, status: updateData.status }, '操作成功');
  } catch (err) {
    return handlePrismaError(err, '操作失败');
  }
}