export const dynamic = 'force-dynamic';

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { success, errors } from '@/lib/api/v1';
import { recordAuditLog } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/v1/admin/repos/[id] - 更新仓库属性
export const PATCH = defineRoute({
  auth: 'required',
  validation: z.object({
    visibility: z.number().optional(),
    isArchived: z.boolean().optional(),
  }),
  async handler({ user, body, params }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { id } = params;
    const { visibility, isArchived } = body;

    const repo = await prisma.repository.findUnique({
      where: { id },
      select: { id: true, name: true, owner: { select: { username: true } }, deletedAt: true },
    });

    if (!repo) {
      return errors.notFound('仓库');
    }

    if (repo.deletedAt) {
      return errors.badRequest('该仓库已被删除');
    }

    const updateData: { visibility?: number; isArchived?: boolean } = {};
    if (visibility !== undefined && [0, 1, 2].includes(visibility)) {
      updateData.visibility = visibility;
    }
    if (isArchived !== undefined) {
      updateData.isArchived = Boolean(isArchived);
    }

    if (Object.keys(updateData).length === 0) {
      return errors.badRequest('未提供有效的更新字段');
    }

    const updated = await prisma.repository.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, visibility: true, isArchived: true },
    });

    // TODO: 将 recordAuditLog 迁移到 AsyncJob.enqueue('record_audit', {...})
    await recordAuditLog({
      adminId: user!.id,
      actionType: 'update_repo',
      targetType: 'repository',
      targetId: id,
      details: {
        message: `更新仓库 ${repo.owner.username}/${repo.name} 的属性`,
        changes: updateData,
      },
    });

    return success(updated, '仓库更新成功');
  },
});

// DELETE /api/v1/admin/repos/[id] - 删除单个仓库（软删除）
export const DELETE = defineRoute({
  auth: 'required',
  async handler({ user, params }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { id } = params;

    const repo = await prisma.repository.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        ownerId: true,
        owner: { select: { username: true } },
        deletedAt: true,
      },
    });

    if (!repo) {
      return errors.notFound('仓库');
    }

    if (repo.deletedAt) {
      return errors.badRequest('该仓库已被删除');
    }

    await prisma.repository.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // TODO: 将 recordAuditLog 迁移到 AsyncJob.enqueue('record_audit', {...})
    await recordAuditLog({
      adminId: user!.id,
      userId: user!.id,
      actionType: 'delete',
      targetType: 'repository',
      targetId: id,
      details: { repo: `${repo.owner.username}/${repo.name}` },
    });

    return success({ id }, '仓库已删除');
  },
});
