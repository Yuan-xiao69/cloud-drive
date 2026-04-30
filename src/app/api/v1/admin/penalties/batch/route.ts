export const dynamic = 'force-dynamic';

/**
 * v1 处罚批量操作 API
 * POST /api/v1/admin/penalties/batch - 批量操作（解除/撤销）
 */

import { NextRequest } from 'next/server';
import { success, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isAuthError, recordAuditLog } from '@/lib/auth';

// POST /api/v1/admin/penalties/batch - 批量操作
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const body = await req.json();
    const { action, penaltyIds, reason } = body;

    if (!action || !penaltyIds || !Array.isArray(penaltyIds) || penaltyIds.length === 0) {
      return errors.badRequest('缺少必填参数：action, penaltyIds');
    }

    // 只有超级管理员可以执行批量操作
    if (auth.role !== 'super_admin') {
      return errors.forbidden('只有超级管理员可以执行处罚批量操作');
    }

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
              removedBy: auth.userId,
              removeReason: reason || '批量解除',
            },
          });

          await recordAuditLog({
            adminId: auth.userId,
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
              removedBy: auth.userId,
              removeReason: reason || '批量撤销',
            },
          });

          await recordAuditLog({
            adminId: auth.userId,
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
  } catch (err) {
    return handlePrismaError(err, '批量操作失败');
  }
}