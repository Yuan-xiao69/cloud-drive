export const dynamic = 'force-dynamic';

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { success, errors } from '@/lib/api/v1';
import { recordAuditLog } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE /api/v1/admin/penalties/[penaltyId] - 解除处罚
export const DELETE = defineRoute({
  auth: 'required',
  validation: z.object({
    reason: z.string().optional(),
  }),
  async handler({ user, body, params }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { penaltyId } = params;
    const removeReason = body.reason || '';

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
      return errors.badRequest('该处罚已被解除或已过期');
    }

    await prisma.userPenalty.update({
      where: { id: penaltyId },
      data: {
        isActive: false,
        removedAt: new Date(),
        removedBy: user!.id,
        removeReason: removeReason || undefined,
      },
    });

    // TODO: 将 recordAuditLog 迁移到 AsyncJob.enqueue('record_audit', {...})
    await recordAuditLog({
      adminId: user!.id,
      userId: penalty.userId,
      actionType: 'remove_penalty',
      targetType: 'penalty',
      targetId: penaltyId,
      details: { penaltyType: penalty.penaltyType, username: penalty.user.username, removeReason },
    });

    return success({ id: penaltyId }, '处罚已解除');
  },
});
