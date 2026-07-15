export const dynamic = 'force-dynamic';

/**
 * v1 处罚模板使用 API
 * POST /api/v1/admin/penalty-templates/[templateId]/use - 使用模板对用户进行处罚
 */

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { success, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/auth';

// POST /api/v1/admin/penalty-templates/[templateId]/use - 使用模板
export const POST = defineRoute({
  auth: 'required',
  validation: z.object({
    userId: z.string(),
    duration: z.number().optional(),
  }),
  async handler({ user, body, params }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    if (user!.role !== 'super_admin') {
      return errors.forbidden('只有超级管理员可以使用处罚模板');
    }

    const { templateId } = params;
    const { userId, duration } = body;

    // 获取模板
    const template = await prisma.penaltyTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return errors.notFound('模板');
    }

    if (!template.isActive) {
      return errors.badRequest('该模板已被禁用');
    }

    // 检查目标用户
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, isSystem: true, role: true },
    });

    if (!targetUser) {
      return errors.notFound('用户');
    }

    if (targetUser.isSystem) {
      return errors.forbidden('不能对系统内置用户添加处罚');
    }

    if (userId === user!.id) {
      return errors.forbidden('不能对自己添加处罚');
    }

    // 使用模板指定的天数或默认天数
    const expiresDays = duration || template.defaultDuration;
    const expiresAt = expiresDays ? new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000) : null;

    // 创建处罚
    const penalty = await prisma.userPenalty.create({
      data: {
        userId,
        penaltyType: template.penaltyType,
        reason: template.reason,
        value: expiresDays || 0,
        appliedBy: user!.id,
        expiresAt,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
          },
        },
        applier: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    await prisma.penaltyTemplate.update({
      where: { id: templateId },
      data: {
        usageCount: { increment: 1 },
      },
    });

    // TODO: 将 recordAuditLog 迁移到 AsyncJob.enqueue('record_audit', {...})
    await recordAuditLog({
      adminId: user!.id,
      userId: user!.id,
      actionType: 'create_penalty_from_template',
      targetType: 'penalty',
      targetId: penalty.id,
      details: { template: template.name, targetUser: targetUser.username, penaltyType: template.penaltyType, duration: expiresDays || template.defaultDuration },
    });

    return success({
      penalty: {
        ...penalty,
        status: 'active',
        remainingDays: expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
      },
    }, '使用模板处罚成功');
  },
});