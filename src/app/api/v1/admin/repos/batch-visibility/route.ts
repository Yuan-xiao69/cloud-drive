export const dynamic = 'force-dynamic';
/**
 * v1 仓库批量修改可见性 API
 * POST /api/v1/admin/repos/batch-visibility - 批量修改仓库可见性
 */

import { NextRequest } from 'next/server';
import { success, handlePrismaError, errors } from '@/lib/api/v1';
import { requireAdmin, isAuthError, recordAuditLog } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/v1/admin/repos/batch-visibility - 批量修改仓库可见性
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const { ids, visibility } = await req.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return errors.badRequest('请选择要操作的仓库');
    }

    // visibility: 0=私有, 1=内部, 2=公开
    if (visibility === undefined || ![0, 1, 2].includes(visibility)) {
      return errors.badRequest('visibility 必须是 0(私有)、1(内部) 或 2(公开)');
    }

    const updateResult = await prisma.repository.updateMany({
      where: { id: { in: ids } },
      data: { visibility },
    });

    const visibilityText = visibility === 0 ? '私有' : visibility === 1 ? '内部' : '公开';

    await recordAuditLog({
      adminId: auth.userId,
      actionType: 'batch_change_visibility',
      targetType: 'repository',
      targetId: ids.join(','),
      details: {
        message: `批量修改了 ${updateResult.count} 个仓库的可见性为 ${visibilityText}`,
        visibility,
      },
    });

    const visibilityStr = visibility === 0 ? 'private' : visibility === 1 ? 'internal' : 'public';

    return success({
      count: updateResult.count,
      visibility: visibilityStr,
    }, `成功修改 ${updateResult.count} 个仓库的可见性为 ${visibilityText}`);
  } catch (err) {
    console.error('批量修改仓库可见性失败:', err);
    return handlePrismaError(err);
  }
}
