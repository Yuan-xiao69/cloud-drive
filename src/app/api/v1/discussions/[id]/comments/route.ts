export const dynamic = 'force-dynamic';
/**
 * API v1 - 讨论评论 API
 * GET /api/v1/discussions/[id]/comments - 获取讨论的评论列表
 * POST /api/v1/discussions/[id]/comments - 添加评论
 */

import { NextRequest } from 'next/server';
import { success, created, paginated, error, handlePrismaError, errors } from '@/lib/api/v1';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sanitizeText } from '@/lib/security';
import { checkRateLimit } from '@/lib/rate-limit';
import { parsePagination, buildPaginationMeta } from '@/lib/api/v1/pagination';
import { logActivity } from '@/lib/activity-log';

// GET /api/v1/discussions/[id]/comments - 获取评论列表
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const { page, size, skip } = parsePagination(searchParams);

    // 检查讨论是否存在
    const discussion = await prisma.discussion.findUnique({
      where: { id, isDeleted: false },
      select: { id: true, authorId: true },
    });

    if (!discussion) {
      return error('NOT_FOUND', { message: '讨论不存在' });
    }

    // 获取顶级评论（parentId 为空）
    const [comments, total] = await Promise.all([
      prisma.discussionComment.findMany({
        where: { discussionId: id, parentId: null, isDeleted: false },
        include: {
          author: {
            select: { id: true, username: true, avatarUrl: true },
          },
          // 获取回复数量
          _count: {
            select: { replies: { where: { isDeleted: false } } },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: size,
      }),
      prisma.discussionComment.count({
        where: { discussionId: id, parentId: null, isDeleted: false },
      }),
    ]);

    // 获取每个顶级评论的回复
    const commentIds = comments.map(c => c.id);
    const replies = await prisma.discussionComment.findMany({
      where: {
        discussionId: id,
        parentId: { in: commentIds },
        isDeleted: false,
      },
      include: {
        author: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // 按 parentId 分组回复
    interface ReplyItem {
      id: string;
      authorId: string;
      author: { id: string; username: string; avatarUrl: string | null };
      content: string;
      isAccepted: boolean;
      createdAt: Date;
      updatedAt: Date;
    }
    const repliesByParent = replies.reduce<Record<string, ReplyItem[]>>((acc, reply) => {
      if (!acc[reply.parentId!]) {
        acc[reply.parentId!] = [];
      }
      acc[reply.parentId!].push({
        id: reply.id,
        authorId: reply.authorId,
        author: {
          id: reply.author.id,
          username: reply.author.username,
          avatarUrl: reply.author.avatarUrl || null,
        },
        content: reply.content,
        isAccepted: reply.isAccepted,
        createdAt: reply.createdAt,
        updatedAt: reply.updatedAt,
      });
      return acc;
    }, {});

    const items = comments.map(comment => ({
      id: comment.id,
      authorId: comment.authorId,
      author: {
        id: comment.author.id,
        username: comment.author.username,
        avatarUrl: comment.author.avatarUrl || null,
      },
      content: comment.content,
      isAccepted: comment.isAccepted,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      repliesCount: comment._count.replies,
      replies: repliesByParent[comment.id] || [],
    }));

    return paginated(items, buildPaginationMeta(total, page, size));
  } catch (err) {
    return handlePrismaError(err, '获取评论列表失败');
  }
}

// POST /api/v1/discussions/[id]/comments - 添加评论
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;

    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;

    // 速率限制
    const rateLimit = await checkRateLimit(req, 'api');
    if (!rateLimit.allowed) {
      return error('RATE_LIMITED', { message: '操作过于频繁，请稍后再试' });
    }

    // 检查讨论是否存在
    const discussion = await prisma.discussion.findUnique({
      where: { id, isDeleted: false },
      select: { id: true, authorId: true },
    });

    if (!discussion) {
      return error('NOT_FOUND', { message: '讨论不存在' });
    }

    const body = await req.json();
    const { content, parentId } = body;

    // 验证评论内容
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return errors.badRequest('评论内容不能为空');
    }
    if (content.trim().length > 10000) {
      return errors.badRequest('评论内容过长，最大支持 10000 字符');
    }

    // 如果是回复，检查父评论是否存在
    if (parentId) {
      const parentComment = await prisma.discussionComment.findUnique({
        where: { id: parentId, isDeleted: false },
      });
      if (!parentComment) {
        return error('NOT_FOUND', { message: '父评论不存在' });
      }
      if (parentComment.discussionId !== id) {
        return errors.badRequest('父评论不属于该讨论');
      }
    }

    const sanitizedContent = sanitizeText(content.trim());

    const comment = await prisma.discussionComment.create({
      data: {
        discussionId: id,
        authorId: auth.userId,
        content: sanitizedContent,
        parentId: parentId || null,
      },
      include: {
        author: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
    });

    // 记录活动日志
    await logActivity({
      userId: auth.userId,
      action: parentId ? 'reply_discussion' : 'comment_discussion',
      targetType: 'discussion',
      targetId: id,
      targetName: discussion.id,
      req,
    });

    return created({
      id: comment.id,
      authorId: comment.authorId,
      author: {
        id: comment.author.id,
        username: comment.author.username,
        avatarUrl: comment.author.avatarUrl ?? undefined,
      },
      content: comment.content,
      parentId: comment.parentId,
      isAccepted: comment.isAccepted,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    }, parentId ? '回复成功' : '评论成功');
  } catch (err) {
    return handlePrismaError(err, '添加评论失败');
  }
}
