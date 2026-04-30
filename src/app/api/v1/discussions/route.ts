export const dynamic = 'force-dynamic';
/**
 * API v1 - 讨论列表 API
 * GET /api/v1/discussions - 获取讨论列表
 * POST /api/v1/discussions - 创建讨论
 */

import { NextRequest } from 'next/server';
import { success, created, paginated } from '@/lib/api/v1/response';
import { errors } from '@/lib/api/v1/response';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity-log';
import { isUserMuted } from '@/lib/user-restrictions';
import { sanitizeText } from '@/lib/security';
import { checkRateLimit, createRateLimitHeaders } from '@/lib/rate-limit';
import { parsePagination, buildPaginationMeta } from '@/lib/api/v1/pagination';
import type { Prisma } from '@prisma/client';

const VALID_CATEGORIES = ['question', 'idea', 'request', 'team', 'share'];

// GET /api/v1/discussions - 获取讨论列表
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const { page, size, skip } = parsePagination(searchParams);
    const category = searchParams.get('category') || undefined;
    const sort = searchParams.get('sort') || 'latest'; // latest | hot
    const keyword = searchParams.get('keyword') || undefined;

    const where: Prisma.DiscussionWhereInput = { isDeleted: false };
    if (category && VALID_CATEGORIES.includes(category)) {
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
      viewCount: d.viewCount,
      commentsCount: d._count.comments,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    }));

    return paginated(items, buildPaginationMeta(total, page, size));
  } catch (error) {
    console.error('[v1/Discussions] GET Error:', error);
    return errors.internal('获取讨论列表失败');
  }
}

// POST /api/v1/discussions - 创建讨论
export async function POST(req: NextRequest) {
  try {
    // 速率限制检查
    const rateLimit = await checkRateLimit(req, 'api');
    if (!rateLimit.allowed) {
      const headers = createRateLimitHeaders(rateLimit);
      return new Response(
        JSON.stringify({ success: false, message: `请求过于频繁，请 ${rateLimit.retryAfter} 秒后重试` }),
        { status: 429, headers: { 'Content-Type': 'application/json', ...Object.fromEntries(headers) } }
      );
    }

    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;

    // 检查用户是否被禁言
    const muteCheck = await isUserMuted(auth.userId);
    if (muteCheck.muted && muteCheck.penalty) {
      const endStr = muteCheck.penalty.endDate
        ? `，将于 ${muteCheck.penalty.endDate.toLocaleDateString('zh-CN')} 解除`
        : '，永久禁言';
      return errors.forbidden(`您已被禁言：${muteCheck.penalty.reason}${endStr}`);
    }

    const body = await req.json();
    const { title, content, category } = body;

    if (!title?.trim()) return errors.badRequest('标题不能为空');
    if (!content?.trim()) return errors.badRequest('内容不能为空');
    if (!category || !VALID_CATEGORIES.includes(category)) {
      return errors.badRequest(`分类无效，必须为: ${VALID_CATEGORIES.join(', ')}`);
    }

    // XSS 防护：净化用户输入
    const sanitizedTitle = sanitizeText(title.trim());
    const sanitizedContent = sanitizeText(content.trim());

    const discussion = await prisma.discussion.create({
      data: {
        authorId: auth.userId,
        title: sanitizedTitle,
        content: sanitizedContent,
        category,
      },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    // 记录讨论创建日志
    await logActivity({
      userId: auth.userId,
      action: 'create_discussion',
      targetType: 'discussion',
      targetId: discussion.id,
      targetName: discussion.title,
      details: { title: discussion.title, category },
      req,
    });

    return created({
      id: discussion.id,
      authorId: discussion.authorId,
      author: {
        id: discussion.author.id,
        username: discussion.author.username,
        avatarUrl: discussion.author.avatarUrl ?? undefined,
      },
      title: discussion.title,
      content: discussion.content,
      category: discussion.category,
      status: discussion.status,
      viewCount: discussion.viewCount,
      commentsCount: 0,
      createdAt: discussion.createdAt.toISOString(),
      updatedAt: discussion.updatedAt.toISOString(),
    }, '讨论发布成功');
  } catch (error) {
    console.error('[v1/Discussions] POST Error:', error);
    return errors.internal('创建讨论失败');
  }
}
