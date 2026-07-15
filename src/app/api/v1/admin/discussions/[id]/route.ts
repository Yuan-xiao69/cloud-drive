export const dynamic = 'force-dynamic';
/**
 * v1 管理讨论详情 API
 * GET /api/v1/admin/discussions/[id] - 获取单个讨论
 * DELETE /api/v1/admin/discussions/[id] - 删除讨论
 */

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { success, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/auth';

// GET /api/v1/admin/discussions/[id] - 获取单个讨论
export const GET = defineRoute({
  auth: 'none',
  async handler({ params }) {
    const { id } = params;

    const discussion = await prisma.discussion.findUnique({
      where: { id, isDeleted: false },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true, email: true } },
        _count: { select: { comments: { where: { isDeleted: false } } } },
      },
    });

    if (!discussion) {
      return errors.notFound('讨论');
    }

    return success({
      id: discussion.id,
      title: discussion.title,
      content: discussion.content,
      category: discussion.category,
      status: discussion.status,
      viewCount: discussion.viewCount,
      author: discussion.author,
      commentsCount: discussion._count.comments,
      createdAt: discussion.createdAt.toISOString(),
      updatedAt: discussion.updatedAt.toISOString(),
    });
  },
});

// DELETE /api/v1/admin/discussions/[id] - 删除讨论
export const DELETE = defineRoute({
  auth: 'required',
  async handler({ user, params }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { id } = params;

    const existing = await prisma.discussion.findUnique({
      where: { id, isDeleted: false },
    });

    if (!existing) {
      return errors.notFound('讨论');
    }

    await prisma.discussion.update({
      where: { id },
      data: { isDeleted: true },
    });

    // TODO: 将 recordAuditLog 迁移到 AsyncJob.enqueue('record_audit', {...})
    await recordAuditLog({
      adminId: user!.id,
      actionType: 'delete',
      targetType: 'discussion',
      targetId: id,
      details: { message: `删除讨论: ${existing.title}` },
    });

    return success({ id }, '讨论已删除');
  },
});

// PATCH /api/v1/admin/discussions/[id] - 恢复讨论
export const PATCH = defineRoute({
  auth: 'required',
  validation: z.object({
    action: z.literal('restore'),
  }),
  async handler({ user, params }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { id } = params;

    const existing = await prisma.discussion.findUnique({
      where: { id, isDeleted: true },
    });

    if (!existing) {
      return errors.notFound('讨论不存在或未被删除');
    }

    await prisma.discussion.update({
      where: { id },
      data: { isDeleted: false },
    });

    // TODO: 将 recordAuditLog 迁移到 AsyncJob.enqueue('record_audit', {...})
    await recordAuditLog({
      adminId: user!.id,
      actionType: 'restore',
      targetType: 'discussion',
      targetId: id,
      details: { message: `恢复讨论: ${existing.title}` },
    });

    return success({ id }, '讨论已恢复');
  },
});
