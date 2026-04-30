export const dynamic = 'force-dynamic';
/**
 * v1 仓库批量归档 API
 * POST /api/v1/admin/repos/batch-archive - 批量归档仓库
 */

import { NextRequest } from 'next/server';
import { success, handlePrismaError, errors } from '@/lib/api/v1';
import { requireAdmin, isAuthError, recordAuditLog } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/v1/admin/repos/batch-archive - 批量归档仓库
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const { ids, action } = await req.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return errors.badRequest('请选择要操作的仓库');
    }

    // action: 'archive' 归档, 'unarchive' 取消归档
    if (!['archive', 'unarchive'].includes(action)) {
      return errors.badRequest('action 必须是 archive 或 unarchive');
    }

    const updateResult = await prisma.repository.updateMany({
      where: { id: { in: ids } },
      data: { isArchived: action === 'archive' },
    });

    await recordAuditLog({
      adminId: auth.userId,
      actionType: 'batch_archive_repos',
      targetType: 'repository',
      targetId: ids.join(','),
      details: {
        message: `批量${action === 'archive' ? '归档' : '取消归档'}了 ${updateResult.count} 个仓库`,
        action,
      },
    });

    return success({
      count: updateResult.count,
      action,
    }, `成功${action === 'archive' ? '归档' : '取消归档'} ${updateResult.count} 个仓库`);
  } catch (err) {
    console.error('批量归档仓库失败:', err);
    return handlePrismaError(err);
  }
}
