export const dynamic = 'force-dynamic';
/**
 * v1 用户批量删除 API
 * POST /api/v1/admin/users/batch-delete - 批量删除用户
 */

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { success, errors } from '@/lib/api/v1';
import { recordAuditLog } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/v1/admin/users/batch-delete - 批量删除用户
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

    // 检查是否包含超级管理员
    const superAdmin = await prisma.user.findFirst({
      where: { id: { in: ids }, role: 'super_admin' },
    });

    if (superAdmin) {
      return errors.forbidden('禁止删除超级管理员账号');
    }

    const deleteResult = await prisma.user.deleteMany({
      where: { id: { in: ids } },
    });

    // TODO: 将 recordAuditLog 迁移到 AsyncJob.enqueue('record_audit', {...})
    await recordAuditLog({
      adminId: user!.id,
      actionType: 'batch_delete_users',
      targetType: 'user',
      targetId: ids.join(','),
      details: { message: `批量删除了 ${deleteResult.count} 个用户` },
    });

    return success({
      count: deleteResult.count,
    }, `成功删除 ${deleteResult.count} 个用户`);
  },
});
