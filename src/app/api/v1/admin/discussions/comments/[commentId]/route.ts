export const dynamic = 'force-dynamic';
/**
 * v1 管理讨论评论详情 API
 * GET /api/v1/admin/discussions/comments/[commentId] - 获取单个评论
 * DELETE /api/v1/admin/discussions/comments/[commentId] - 删除评论
 */

import { defineRoute } from '@/lib/framework/define-route';
import { success, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';

// GET /api/v1/admin/discussions/comments/[commentId] - 获取单个评论
export const GET = defineRoute({
  auth: 'none',
  async handler({ params }) {
    const { commentId } = params;

    const comment = await prisma.discussionComment.findUnique({
      where: { id: commentId, isDeleted: false },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
        discussion: { select: { id: true, title: true } },
      },
    });

    if (!comment) {
      return errors.notFound('评论');
    }

    return success({
      id: comment.id,
      discussionId: comment.discussionId,
      discussion: comment.discussion,
      content: comment.content,
      author: comment.author,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    });
  },
});

// DELETE /api/v1/admin/discussions/comments/[commentId] - 删除评论
export const DELETE = defineRoute({
  auth: 'required',
  async handler({ user, params }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { commentId } = params;

    const existing = await prisma.discussionComment.findUnique({
      where: { id: commentId, isDeleted: false },
    });

    if (!existing) {
      return errors.notFound('评论');
    }

    await prisma.discussionComment.update({
      where: { id: commentId },
      data: { isDeleted: true },
    });

    return success({ id: commentId }, '评论已删除');
  },
});
