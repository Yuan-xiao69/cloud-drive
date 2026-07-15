export const dynamic = 'force-dynamic';

/**
 * v1 处罚延长 API
 * POST /api/v1/admin/penalties/[penaltyId]/extend - 延长处罚时间
 */

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { success, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/auth';

// POST /api/v1/admin/penalties/[penaltyId]/extend - 延长处罚
export const POST = defineRoute({
  auth: 'required',
  validation: z.object({
    days: z.number().min(1),
  }),
  async handler({ user, body, params }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    if (user!.role !== 'super_admin') {
      return errors.forbidden('只有超级管理员可以延长处罚');
    }

    const { penaltyId } = params;
    const { days } = body;

    const penalty = await prisma.userPenalty.findUnique({
      where: { id: penaltyId },
      include: {
        user: { select: { id: true, username: true } },
      },
    });

    if (!penalty) {
      return errors.notFound('处罚记录');
    }

    if (!penalty.isActive) {
      return errors.badRequest('该处罚已被解除或已过期，无法延长');
    }

    const currentExpiry = penalty.expiresAt || new Date();
    const newExpiresAt = new Date(currentExpiry.getTime() + days * 24 * 60 * 60 * 1000);

    await prisma.userPenalty.update({
      where: { id: penaltyId },
      data: { expiresAt: newExpiresAt },
    });

    // TODO: 将 recordAuditLog 迁移到 AsyncJob.enqueue('record_audit', {...})
    await recordAuditLog({
      adminId: user!.id,
      actionType: 'extend_penalty',
      targetType: 'penalty',
      targetId: penaltyId,
      details: { message: `延长处罚 ${penalty.penaltyType} - ${penalty.user.username}：延长 ${days} 天，新过期时间：${newExpiresAt.toLocaleString()}` },
    });

    return success({
      id: penaltyId,
      expiresAt: newExpiresAt,
      remainingDays: Math.ceil((newExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    }, '处罚已延长');
  },
});