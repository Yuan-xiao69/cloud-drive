export const dynamic = 'force-dynamic';
/**
 * v1 公告 API
 * GET /api/v1/announcements - 获取活跃公告（所有登录用户可见）
 * POST /api/v1/announcements - 创建公告（仅管理员）
 * GET /api/v1/announcements/[id] - 获取单个公告
 * PATCH /api/v1/announcements/[id] - 更新公告（仅管理员）
 * DELETE /api/v1/announcements/[id] - 删除公告（仅管理员）
 */

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { success, error } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/lib/api/v1';

// GET /api/v1/announcements - 获取活跃公告
export const GET = defineRoute({
  auth: 'none',
  async handler() {
    const now = new Date();

    // 获取所有活跃且未过期的公告
    const announcements = await prisma.announcement.findMany({
      where: {
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      orderBy: [
        { isPinned: 'desc' },
        { priority: 'desc' },
        { publishedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 10,
      select: {
        id: true,
        title: true,
        content: true,
        type: true,
        priority: true,
        isPinned: true,
        publishedAt: true,
        expiresAt: true,
      },
    });

    return success({
      announcements,
      count: announcements.length,
    });
  },
});

// POST /api/v1/announcements - 创建公告（仅管理员）
export const POST = defineRoute({
  auth: 'required',
  validation: z.object({
    title: z.string().min(1, '标题不能为空'),
    content: z.string().min(1, '内容不能为空'),
    type: z.string().optional(),
    priority: z.string().optional(),
    isPinned: z.boolean().optional(),
    publishedAt: z.string().optional(),
    expiresAt: z.string().optional(),
  }),
  async handler({ user, body }) {
    // 管理员权限检查
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return error(ErrorCodes.FORBIDDEN, { message: '无权限访问管理面板' });
    }

    const { title, content, type, priority, isPinned, publishedAt, expiresAt } = body;

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        type: type || 'info',
        priority: priority || 'normal',
        isPinned: isPinned || false,
        publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: user!.id,
      },
    });

    return success(announcement, '公告创建成功');
  },
});
