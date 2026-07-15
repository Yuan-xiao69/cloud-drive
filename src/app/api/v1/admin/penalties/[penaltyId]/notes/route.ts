export const dynamic = 'force-dynamic';

/**
 * v1 处罚备注 API
 * GET /api/v1/admin/penalties/[penaltyId]/notes - 获取备注列表
 * POST /api/v1/admin/penalties/[penaltyId]/notes - 添加备注
 */

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { success, created, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/auth';

// GET /api/v1/admin/penalties/[penaltyId]/notes - 获取备注列表
export const GET = defineRoute({
  auth: 'required',
  async handler({ user, params }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { penaltyId } = params;

    const penalty = await prisma.userPenalty.findUnique({
      where: { id: penaltyId },
    });

    if (!penalty) {
      return errors.notFound('处罚记录');
    }

    const notes = await prisma.penaltyNote.findMany({
      where: { penaltyId },
      orderBy: { createdAt: 'desc' },
    });

    return success({ notes });
  },
});

// POST /api/v1/admin/penalties/[penaltyId]/notes - 添加备注
export const POST = defineRoute({
  auth: 'required',
  validation: z.object({
    content: z.string().min(1, '备注内容不能为空'),
  }),
  async handler({ user, body, params }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { penaltyId } = params;
    const { content } = body;

    const penalty = await prisma.userPenalty.findUnique({
      where: { id: penaltyId },
      include: {
        user: { select: { username: true } },
      },
    });

    if (!penalty) {
      return errors.notFound('处罚记录');
    }

    const note = await prisma.penaltyNote.create({
      data: {
        penaltyId,
        content: content.trim(),
        createdBy: user!.id,
      },
    });

    // TODO: 将 recordAuditLog 迁移到 AsyncJob.enqueue('record_audit', {...})
    await recordAuditLog({
      adminId: user!.id,
      userId: penalty.userId,
      actionType: 'add_penalty_note',
      targetType: 'penalty',
      targetId: penaltyId,
      details: { note: content.trim().slice(0, 50) },
    });

    return created({ note }, '备注添加成功');
  },
});