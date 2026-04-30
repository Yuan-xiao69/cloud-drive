export const dynamic = 'force-dynamic';
/**
 * v1 仓库批量删除 API
 * POST /api/v1/admin/repos/batch-delete - 批量删除仓库
 */

import { NextRequest } from 'next/server';
import { success, created, handlePrismaError, errors } from '@/lib/api/v1';
import { requireAdmin, isAuthError, recordAuditLog } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/v1/admin/repos/batch-delete - 批量删除仓库
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const { ids } = await req.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return errors.badRequest('请选择要删除的仓库');
    }

    // 执行软删除
    const deleteResult = await prisma.repository.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: new Date() },
    });

    // 记录审计日志
    await recordAuditLog({
      adminId: auth.userId,
      actionType: 'batch_delete_repos',
      targetType: 'repository',
      targetId: ids.join(','),
      details: { message: `批量删除了 ${deleteResult.count} 个仓库` },
    });

    return success({
      count: deleteResult.count,
    }, `成功删除 ${deleteResult.count} 个仓库`);
  } catch (err) {
    console.error('批量删除仓库失败:', err);
    return handlePrismaError(err);
  }
}
