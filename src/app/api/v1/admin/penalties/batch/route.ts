export const dynamic = 'force-dynamic';

/**
 * v1 处罚批量操作 API
 * POST /api/v1/admin/penalties/batch - 批量操作（解除/撤销）
 */

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { success, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/auth';

// POST /api/v1/admin/penalties/batch - 批量操作
export const POST = defineRoute({
  auth: 'required',
  validation: z.object({
    action: z.enum(['release', 'revoke']),
    penaltyIds: z.array(z.string()).min(1),
    reason: z.string().optional(),
  }),
  async handler({ user, body }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    if (user!.role !== 'super_admin') {
      return errors.forbidden('只有超级管理员可以执行处罚批量操作');
    }

    const { action, penaltyIds, reason } = body;

    if (!['release', 'revoke'].includes(action)) {
      return errors.badRequest('无效的操作类型，仅支持：release（解除）、revoke（撤销）');
    }

    // 获取处罚记录
    const penalties = await prisma.userPenalty.findMany({
      where: {
        id: { in: penaltyIds },
      },
      include: {
        user: { select: { id: true, username: true } },
      },
    });

    if (penalties.length === 0) {
      return errors.notFound('未找到匹配的处罚记录');
    }

    const now = new Date();
    const results: { id: string; success: boolean; error?: string }[] = [];

    // 执行批量操作
    for (const penalty of penalties) {
      try {
        if (action === 'release') {
          // 解除处罚（软解除，保留记录）
          if (!penalty.isActive) {
            results.push({ id: penalty.id, success: false, error: '该处罚已被解除或已过期' });
            continue;
          }

          await prisma.userPenalty.update({
            where: { id: penalty.id },
            data: {
              isActive: false,
              removedAt: now,
              removedBy: user!.id,
              removeReason: reason || '批量解除',
            },
          });

          // TODO: 将 recordAuditLog 迁移到 AsyncJob.enqueue('record_audit', {...})
          await recordAuditLog({
            adminId: user!.id,
            userId: penalty.userId,
            actionType: 'batch_release_penalty',
            targetType: 'penalty',
            targetId: penalty.id,
            details: { penaltyType: penalty.penaltyType, username: penalty.user.username },
          });

          results.push({ id: penalty.id, success: true });
        } else if (action === 'revoke') {
          // 撤销处罚（保留记录但标记为已撤销）
          await prisma.userPenalty.update({
            where: { id: penalty.id },
            data: {
              isActive: false,
              removedAt: now,
              removedBy: user!.id,
              removeReason: reason || '批量撤销',
            },
          });

          // TODO: 将 recordAuditLog 迁移到 AsyncJob.enqueue('record_audit', {...})
          await recordAuditLog({
            adminId: user!.id,
            userId: penalty.userId,
            actionType: 'batch_revoke_penalty',
            targetType: 'penalty',
            targetId: penalty.id,
            details: { penaltyType: penalty.penaltyType, username: penalty.user.username },
          });

          results.push({ id: penalty.id, success: true });
        }
      } catch (err) {
        results.push({ id: penalty.id, success: false, error: '操作失败' });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return success({
      total: penalties.length,
      successCount,
      failCount,
      results,
    }, `批量操作完成：成功 ${successCount} 条，失败 ${failCount} 条`);
  },
});