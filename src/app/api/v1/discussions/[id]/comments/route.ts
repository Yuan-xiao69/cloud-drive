export const dynamic = 'force-dynamic';
/**
 * API v1 - 讨论评论 API
 * GET /api/v1/discussions/[id]/comments - 获取讨论的评论列表
 * POST /api/v1/discussions/[id]/comments - 添加评论
 */

import { z } from 'zod';
import { defineRoute } from '@/lib/framework/define-route';
import { success, created, paginated, error } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { DiscussionService } from '@/services/discussion-service';
import { parsePagination, buildPaginationMeta } from '@/lib/api/v1/pagination';
import { logActivity } from '@/lib/activity-log';

const createCommentSchema = z.object({
  content: z.string().min(1, '评论内容不能为空').max(10000, '评论内容过长'),
  parentId: z.string().optional(),
});

// GET /api/v1/discussions/[id]/comments - 获取评论列表
export const GET = defineRoute({
  auth: 'none',
  handler: async ({ req, params }) => {
    const { id } = params;
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
  },
});

// POST /api/v1/discussions/[id]/comments - 添加评论
export const POST = defineRoute({
  auth: 'required',
  rateLimit: 'default',
  validation: createCommentSchema,
  handler: async ({ req, user, body, params }) => {
    const { id } = params;
    const { content, parentId } = body;

    const comment = await DiscussionService.addComment(
      id,
      user!.id,
      content,
      parentId,
    );

    // 记录活动日志
    await logActivity({
      userId: user!.id,
      action: parentId ? 'reply_discussion' : 'comment_discussion',
      targetType: 'discussion',
      targetId: id,
      targetName: id,
      req,
    });

    return created(comment, parentId ? '回复成功' : '评论成功');
  },
});
