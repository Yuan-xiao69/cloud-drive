export const dynamic = 'force-dynamic';
/**
 * API v1 - 讨论列表 API
 * GET /api/v1/discussions - 获取讨论列表
 * POST /api/v1/discussions - 创建讨论
 */

import { z } from 'zod';
import { defineRoute } from '@/lib/framework/define-route';
import { success, created, paginated } from '@/lib/api/v1/response';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-log';
import { DiscussionService } from '@/services/discussion-service';
import { parsePagination, buildPaginationMeta } from '@/lib/api/v1/pagination';
import type { Prisma } from '@prisma/client';

const VALID_CATEGORIES = ['general', 'qa', 'share', 'suggestion', 'announce'] as const;

const createDiscussionSchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  content: z.string().min(1, '内容不能为空'),
  category: z.enum(VALID_CATEGORIES),
  tags: z.array(z.string()).max(10).optional().default([]),
});

// GET /api/v1/discussions - 获取讨论列表
export const GET = defineRoute({
  auth: 'none',
  handler: async ({ req }) => {
    const { searchParams } = new URL(req.url);
    const { page, size, skip } = parsePagination(searchParams);
    const category = searchParams.get('category') || undefined;
    const sort = searchParams.get('sort') || 'latest'; // latest | hot
    const keyword = searchParams.get('keyword') || undefined;

    const where: Prisma.DiscussionWhereInput = { isDeleted: false };
    if (category && VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])) {
      where.category = category;
    }
    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { content: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    // 排序
    let orderBy: Prisma.DiscussionOrderByWithRelationInput[];
    switch (sort) {
      case 'time_asc':
        orderBy = [{ createdAt: 'asc' as const }];
        break;
      case 'name':
        orderBy = [{ title: 'asc' as const }];
        break;
      case 'hot':
      case 'popular':
      case 'most_star':
        orderBy = [{ viewCount: 'desc' as const }, { createdAt: 'desc' as const }];
        break;
      default:
        orderBy = [{ createdAt: 'desc' as const }];
    }

    const [discussions, total] = await Promise.all([
      prisma.discussion.findMany({
        where,
        include: {
          author: { select: { id: true, username: true, avatarUrl: true } },
          comments: {
            where: { isDeleted: false, isAccepted: true },
            select: { id: true },
          },
          _count: { select: { comments: { where: { isDeleted: false } } } },
        },
        orderBy,
        skip,
        take: size,
      }),
      prisma.discussion.count({ where }),
    ]);

    const items = discussions.map((d) => ({
      id: d.id,
      authorId: d.authorId,
      author: {
        id: d.author.id,
        username: d.author.username,
        avatarUrl: d.author.avatarUrl ?? undefined,
      },
      title: d.title,
      content: d.content.slice(0, 200), // 列表只返回摘要
      category: d.category,
      status: d.status,
      tags: d.tags,
      isWiki: d.isWiki,
      hasAccepted: d.comments.length > 0,
      viewCount: d.viewCount,
      commentsCount: d._count.comments,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    }));

    return paginated(items, buildPaginationMeta(total, page, size));
  },
});

// POST /api/v1/discussions - 创建讨论
export const POST = defineRoute({
  auth: 'required',
  rateLimit: 'default',
  validation: createDiscussionSchema,
  handler: async ({ req, user, body }) => {
    const { title, content, category, tags } = body;

    const discussion = await DiscussionService.create({
      userId: user!.id,
      title,
      content,
      category,
      tags,
    });

    // 记录讨论创建日志
    await logActivity({
      userId: user!.id,
      action: 'create_discussion',
      targetType: 'discussion',
      targetId: discussion.id,
      targetName: discussion.title,
      details: { title: discussion.title, category },
      req,
    });

    return created(discussion, '讨论发布成功');
  },
});
