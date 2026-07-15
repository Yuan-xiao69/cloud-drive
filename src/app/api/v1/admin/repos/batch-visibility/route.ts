export const dynamic = 'force-dynamic';
/**
 * v1 仓库批量修改可见性 API
 * POST /api/v1/admin/repos/batch-visibility - 批量修改仓库可见性
 */

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { success, errors } from '@/lib/api/v1';
import { recordAuditLog } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/v1/admin/repos/batch-visibility - 批量修改仓库可见性
export const POST = defineRoute({
  auth: 'required',
  validation: z.object({
    ids: z.array(z.string()).min(1),
    visibility: z.number().refine(v => [0, 1, 2].includes(v), 'visibility 必须是 0(私有)、1(内部) 或 2(公开)'),
  }),
  async handler({ user, body }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { ids, visibility } = body;

    const updateResult = await prisma.repository.updateMany({
      where: { id: { in: ids } },
      data: { visibility },
    });

    const visibilityText = visibility === 0 ? '私有' : visibility === 1 ? '内部' : '公开';

    // TODO: 将 recordAuditLog 迁移到 AsyncJob.enqueue('record_audit', {...})
    await recordAuditLog({
      adminId: user!.id,
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
  },
});
