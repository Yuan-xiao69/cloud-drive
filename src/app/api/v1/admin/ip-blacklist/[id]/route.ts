export const dynamic = 'force-dynamic';
/**
 * v1 IP 黑名单单条操作 API
 * DELETE /api/v1/admin/ip-blacklist/[id] - 移除 IP 黑名单条目
 */

import { defineRoute } from '@/lib/framework/define-route';
import { success, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/auth';

// DELETE /api/v1/admin/ip-blacklist/[id] - 移除 IP 黑名单条目
export const DELETE = defineRoute({
  auth: 'required',
  async handler({ user, params }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { id } = params;

    const entry = await prisma.iPBlacklist.findUnique({
      where: { id },
    });

    if (!entry) {
      return errors.notFound('IP 黑名单条目不存在');
    }

    await prisma.iPBlacklist.delete({
      where: { id },
    });

    // TODO: 将 recordAuditLog 迁移到 AsyncJob.enqueue('record_audit', {...})
    await recordAuditLog({
      adminId: user!.id,
      actionType: 'delete',
      targetType: 'ip_blacklist',
      targetId: id,
      details: { message: `移除 IP 黑名单: ${entry.ipAddress}` },
    });

    return success(null, 'IP 已从黑名单移除');
  },
});
