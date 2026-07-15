export const dynamic = 'force-dynamic';
/**
 * v1 公告管理 API（管理员端）
 * GET /api/v1/admin/announcements - 获取公告列表（包含统计数据）
 */

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { success, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { sanitizeHtml } from '@/lib/security';

// GET /api/v1/admin/announcements - 获取公告列表（包含统计数据）
export const GET = defineRoute({
  auth: 'required',
  async handler({ req, user }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('size') || '20');

    const now = new Date();

    // 并行查询列表和统计数据
    const [announcements, total, activeCount, pinnedCount, scheduledCount] = await Promise.all([
      // 公告列表
      prisma.announcement.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { isPinned: 'desc' },
          { createdAt: 'desc' },
        ],
        // 注意：Announcement 模型没有 creator 关联，只有 createdBy 字段
        // 需要手动查询创建者信息
      }),
      // 总数
      prisma.announcement.count(),
      // 生效中数量
      prisma.announcement.count({
        where: {
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gte: now } },
          ],
        },
      }),
      // 置顶数量
      prisma.announcement.count({
        where: { isPinned: true },
      }),
      // 待发布数量（已设置发布时间但未到时间）
      prisma.announcement.count({
        where: {
          publishedAt: { gt: now },
          isActive: false,
        },
      }),
    ]);

    // 查询创建者信息
    const creatorIds = [...new Set(announcements.map((a) => a.createdBy))];
    const creators = await prisma.user.findMany({
      where: { id: { in: creatorIds } },
      select: { id: true, username: true, avatarUrl: true },
    });
    const creatorMap = new Map(creators.map((c) => [c.id, c]));

    const items = announcements.map((a) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      type: a.type,
      priority: a.priority,
      isPinned: a.isPinned,
      isActive: a.isActive,
      publishedAt: a.publishedAt?.toISOString() ?? null,
      expiresAt: a.expiresAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      createdBy: a.createdBy,
      creator: creatorMap.get(a.createdBy) ?? null,
    }));

    return success({
      items,
      pagination: {
        page,
        limit,
        total,
      },
      stats: {
        total,
        active: activeCount,
        pinned: pinnedCount,
        scheduled: scheduledCount,
      },
    });
  },
});

// POST /api/v1/admin/announcements - 创建公告
export const POST = defineRoute({
  auth: 'required',
  validation: z.object({
    title: z.string().min(1, '标题不能为空').max(200, '标题长度不能超过200个字符'),
    content: z.string().min(1, '内容不能为空').max(10000, '内容长度不能超过10000个字符'),
    type: z.string().optional().default('info'),
    priority: z.string().optional().default('normal'),
    isPinned: z.boolean().optional().default(false),
    isActive: z.boolean().optional().default(true),
    publishedAt: z.string().optional(),
    expiresAt: z.string().optional(),
  }),
  async handler({ user, body }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { title, content, type, priority, isPinned, isActive, publishedAt, expiresAt } = body;

    const announcement = await prisma.announcement.create({
      data: {
        title: sanitizeHtml(title.trim()),
        content: sanitizeHtml(content.trim()),
        type: type || 'info',
        priority: priority || 'normal',
        isPinned: isPinned ?? false,
        isActive: isActive ?? true,
        publishedAt: publishedAt ? new Date(publishedAt) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: user!.id,
      },
    });

    return success(announcement, '公告创建成功');
  },
});
