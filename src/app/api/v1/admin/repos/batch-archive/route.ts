export const dynamic = 'force-dynamic';
/**
 * v1 仓库批量归档 API
 * POST /api/v1/admin/repos/batch-archive - 批量归档仓库
 */

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { success, errors } from '@/lib/api/v1';
import { recordAuditLog } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/v1/admin/repos/batch-archive - 批量归档仓库
export const POST = defineRoute({
  auth: 'required',
  validation: z.object({
    ids: z.array(z.string()).min(1),
    action: z.enum(['archive', 'unarchive']),
  }),
  async handler({ user, body }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { ids, action } = body;

    const updateResult = await prisma.repository.updateMany({
      where: { id: { in: ids } },
      data: { isArchived: action === 'archive' },
    });

    // TODO: 将 recordAuditLog 迁移到 AsyncJob.enqueue('record_audit', {...})
    await recordAuditLog({
      adminId: user!.id,
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
  },
});
