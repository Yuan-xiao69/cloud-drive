export const dynamic = 'force-dynamic';

/**
 * v1 处罚模板管理 API - 单个模板操作
 * PATCH /api/v1/admin/penalty-templates/[templateId] - 更新模板
 * DELETE /api/v1/admin/penalty-templates/[templateId] - 删除模板
 */

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { success, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';

// PATCH /api/v1/admin/penalty-templates/[templateId] - 更新模板
export const PATCH = defineRoute({
  auth: 'required',
  validation: z.object({
    name: z.string().optional(),
    penaltyType: z.string().optional(),
    defaultDuration: z.number().optional(),
    reason: z.string().optional(),
    description: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
  }),
  async handler({ user, body, params }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    if (user!.role !== 'super_admin') {
      return errors.forbidden('只有超级管理员可以修改处罚模板');
    }

    const { templateId } = params;
    const { name, penaltyType, defaultDuration, reason, description, isActive } = body;

    const existing = await prisma.penaltyTemplate.findUnique({
      where: { id: templateId },
    });

    if (!existing) {
      return errors.notFound('模板');
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (penaltyType !== undefined) {
      const validTypes = ['mute', 'repo_limit', 'storage_limit', 'download_limit', 'fork_limit', 'star_limit'];
      if (!validTypes.includes(penaltyType)) {
        return errors.badRequest('无效的处罚类型');
      }
      updateData.penaltyType = penaltyType;
    }
    if (defaultDuration !== undefined) updateData.defaultDuration = defaultDuration;
    if (reason !== undefined) updateData.reason = reason;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;

    const template = await prisma.penaltyTemplate.update({
      where: { id: templateId },
      data: updateData,
    });

    return success({ template }, '模板更新成功');
  },
});

// DELETE /api/v1/admin/penalty-templates/[templateId] - 删除模板
export const DELETE = defineRoute({
  auth: 'required',
  async handler({ user, params }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    if (user!.role !== 'super_admin') {
      return errors.forbidden('只有超级管理员可以删除处罚模板');
    }

    const { templateId } = params;

    const existing = await prisma.penaltyTemplate.findUnique({
      where: { id: templateId },
    });

    if (!existing) {
      return errors.notFound('模板');
    }

    await prisma.penaltyTemplate.delete({
      where: { id: templateId },
    });

    return success({ id: templateId }, '模板删除成功');
  },
});