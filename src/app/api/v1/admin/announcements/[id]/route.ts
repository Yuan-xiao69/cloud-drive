export const dynamic = 'force-dynamic';
/**
 * v1 公告详情 API
 * GET /api/v1/admin/announcements/[id] - 获取单个公告
 * PATCH /api/v1/admin/announcements/[id] - 更新公告
 * DELETE /api/v1/admin/announcements/[id] - 删除公告
 */

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { success, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { sanitizeHtml } from '@/lib/security';

// GET /api/v1/admin/announcements/[id] - 获取单个公告
export const GET = defineRoute({
  auth: 'none',
  async handler({ params }) {
    const { id } = params;

    const announcement = await prisma.announcement.findUnique({
      where: { id },
    });

    if (!announcement) {
      return errors.notFound('公告');
    }

    // 获取创建者信息
    const creator = await prisma.user.findUnique({
      where: { id: announcement.createdBy },
      select: { id: true, username: true, avatarUrl: true },
    });

    return success({
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      priority: announcement.priority,
      isPinned: announcement.isPinned,
      isActive: announcement.isActive,
      publishedAt: announcement.publishedAt?.toISOString() ?? null,
      expiresAt: announcement.expiresAt?.toISOString() ?? null,
      createdAt: announcement.createdAt.toISOString(),
      updatedAt: announcement.updatedAt.toISOString(),
      createdBy: announcement.createdBy,
      creator: creator ? { id: creator.id, username: creator.username, avatarUrl: creator.avatarUrl } : null,
    });
  },
});

// PATCH /api/v1/admin/announcements/[id] - 更新公告
export const PATCH = defineRoute({
  auth: 'required',
  validation: z.object({
    title: z.string().max(200, '标题长度不能超过200个字符').optional(),
    content: z.string().max(10000, '内容长度不能超过10000个字符').optional(),
    type: z.string().optional(),
    priority: z.string().optional(),
    isPinned: z.boolean().optional(),
    isActive: z.boolean().optional(),
    publishedAt: z.string().nullable().optional(),
    expiresAt: z.string().nullable().optional(),
  }),
  async handler({ user, body, params }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { id } = params;
    const { title, content, type, priority, isPinned, isActive, publishedAt, expiresAt } = body;

    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) {
      return errors.notFound('公告');
    }

    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: sanitizeHtml(title) }),
        ...(content !== undefined && { content: sanitizeHtml(content) }),
        ...(type !== undefined && { type }),
        ...(priority !== undefined && { priority }),
        ...(isPinned !== undefined && { isPinned }),
        ...(isActive !== undefined && { isActive }),
        ...(publishedAt !== undefined && { publishedAt: publishedAt ? new Date(publishedAt) : null }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
      },
    });

    return success(announcement, '公告更新成功');
  },
});

// DELETE /api/v1/admin/announcements/[id] - 删除公告
export const DELETE = defineRoute({
  auth: 'required',
  async handler({ user, params }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { id } = params;

    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) {
      return errors.notFound('公告');
    }

    await prisma.announcement.delete({ where: { id } });

    return success({ id }, '公告已删除');
  },
});
