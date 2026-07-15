export const dynamic = 'force-dynamic';
/**
 * v1 仓库批量删除 API
 * POST /api/v1/admin/repos/batch-delete - 批量删除仓库
 */

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { success, errors } from '@/lib/api/v1';
import { recordAuditLog } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/v1/admin/repos/batch-delete - 批量删除仓库
export const POST = defineRoute({
  auth: 'required',
  validation: z.object({
    ids: z.array(z.string()).min(1),
  }),
  async handler({ user, body }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { ids } = body;

    const deleteResult = await prisma.repository.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: new Date() },
    });

    // TODO: 将 recordAuditLog 迁移到 AsyncJob.enqueue('record_audit', {...})
    await recordAuditLog({
      adminId: user!.id,
      actionType: 'batch_delete_repos',
      targetType: 'repository',
      targetId: ids.join(','),
      details: { message: `批量删除了 ${deleteResult.count} 个仓库` },
    });

    return success({
      count: deleteResult.count,
    }, `成功删除 ${deleteResult.count} 个仓库`);
  },
});
