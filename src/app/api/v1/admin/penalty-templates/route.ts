export const dynamic = 'force-dynamic';

/**
 * v1 处罚模板管理 API
 * GET /api/v1/admin/penalty-templates - 获取模板列表
 * POST /api/v1/admin/penalty-templates - 创建模板
 */

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { success, created, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';

// GET /api/v1/admin/penalty-templates - 获取模板列表
export const GET = defineRoute({
  auth: 'required',
  async handler({ req, user }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { searchParams } = new URL(req.url);
    const isActive = searchParams.get('isActive');

    const where: Record<string, unknown> = {};
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const templates = await prisma.penaltyTemplate.findMany({
      where,
      orderBy: { usageCount: 'desc' },
    });

    return success({ templates });
  },
});

// POST /api/v1/admin/penalty-templates - 创建模板
export const POST = defineRoute({
  auth: 'required',
  validation: z.object({
    name: z.string(),
    penaltyType: z.string(),
    defaultDuration: z.number().optional().default(7),
    reason: z.string(),
    description: z.string().nullable().optional(),
  }),
  async handler({ user, body }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    if (user!.role !== 'super_admin') {
      return errors.forbidden('只有超级管理员可以创建处罚模板');
    }

    const { name, penaltyType, defaultDuration, reason, description } = body;

    const validTypes = ['mute', 'repo_limit', 'storage_limit', 'download_limit', 'fork_limit', 'star_limit'];
    if (!validTypes.includes(penaltyType)) {
      return errors.badRequest('无效的处罚类型');
    }

    const template = await prisma.penaltyTemplate.create({
      data: {
        name,
        penaltyType,
        defaultDuration: defaultDuration || 7,
        reason,
        description: description || null,
        createdBy: user!.id,
      },
    });

    return created({ template }, '模板创建成功');
  },
});