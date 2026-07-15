export const dynamic = 'force-dynamic';

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { success, errors } from '@/lib/api/v1';
import { recordAuditLog } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const VALID_ROLES = ['user', 'admin', 'super_admin'] as const;

// PATCH /api/v1/admin/users/[id]/role - 修改用户角色
export const PATCH = defineRoute({
  auth: 'required',
  validation: z.object({
    role: z.enum(VALID_ROLES),
  }),
  async handler({ user, body, params }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    if (user!.role !== 'super_admin') {
      return errors.forbidden('仅超级管理员可修改用户角色');
    }

    const { id } = params;
    const { role } = body;

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, role: true, isSystem: true },
    });

    if (!targetUser) {
      return errors.notFound('用户');
    }

    if (targetUser.isSystem) {
      return errors.forbidden('无法修改系统内置账号的角色');
    }

    if (targetUser.id === user!.id) {
      return errors.forbidden('无法修改自己的角色');
    }

    const previousRole = targetUser.role;

    await prisma.user.update({
      where: { id },
      data: { role },
    });

    // TODO: 将 recordAuditLog 迁移到 AsyncJob.enqueue('record_audit', {...})
    await recordAuditLog({
      adminId: user!.id,
      userId: user!.id,
      actionType: 'update_role',
      targetType: 'user',
      targetId: id,
      details: { username: targetUser.username, previousRole, newRole: role },
    });

    return success({ userId: id, previousRole, newRole: role }, '用户角色已更新');
  },
});
