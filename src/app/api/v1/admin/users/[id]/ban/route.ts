export const dynamic = 'force-dynamic';

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { success, errors } from '@/lib/api/v1';
import { recordAuditLog, invalidateAllTokens } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/v1/admin/users/[id]/ban - 封禁用户
export const POST = defineRoute({
  auth: 'required',
  validation: z.object({
    reason: z.string().optional(),
  }),
  async handler({ user, body, params }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    if (user!.role !== 'super_admin') {
      return errors.forbidden('仅超级管理员可执行封禁操作');
    }

    const { id } = params;

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, isSystem: true, role: true, isBanned: true },
    });

    if (!targetUser) {
      return errors.notFound('用户');
    }

    if (targetUser.isSystem) {
      return errors.forbidden('无法封禁系统内置账号');
    }

    if (targetUser.id === user!.id) {
      return errors.forbidden('无法封禁自己');
    }

    if (targetUser.role === 'super_admin') {
      return errors.forbidden('无法封禁超级管理员');
    }

    if (targetUser.isBanned) {
      return errors.conflict('该用户已被封禁');
    }

    const reason = body.reason?.trim() || '管理员直接封禁';

    await prisma.$transaction(async (tx) => {
      await tx.userBan.create({
        data: {
          userId: id,
          bannerId: user!.id,
          reason,
          banType: 'permanent',
          isActive: true,
        },
      });

      await tx.user.update({
        where: { id },
        data: { isBanned: true },
      });
    });

    await invalidateAllTokens(id);

    // TODO: 将 recordAuditLog 迁移到 AsyncJob.enqueue('record_audit', {...})
    await recordAuditLog({
      adminId: user!.id,
      actionType: 'ban',
      targetType: 'user',
      targetId: id,
      details: { username: targetUser.username },
    });

    return success({ userId: id }, '用户已被封禁');
  },
});

// DELETE /api/v1/admin/users/[id]/ban - 解封用户
export const DELETE = defineRoute({
  auth: 'required',
  async handler({ user, params }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { id } = params;

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, isBanned: true },
    });

    if (!targetUser) {
      return errors.notFound('用户');
    }

    if (!targetUser.isBanned) {
      return errors.badRequest('该用户未被封禁');
    }

    await prisma.$transaction(async (tx) => {
      await tx.userBan.updateMany({
        where: { userId: id, isActive: true },
        data: {
          isActive: false,
          unbanReason: '管理员解除封禁',
          unbannedAt: new Date(),
          unbannedBy: user!.id,
        },
      });

      await tx.user.update({
        where: { id },
        data: { isBanned: false },
      });
    });

    // TODO: 将 recordAuditLog 迁移到 AsyncJob.enqueue('record_audit', {...})
    await recordAuditLog({
      adminId: user!.id,
      actionType: 'unban',
      targetType: 'user',
      targetId: id,
      details: { username: targetUser.username },
    });

    return success({ userId: id }, '用户已解封');
  },
});
