export const dynamic = 'force-dynamic';
/**
 * v1 管理讨论评论详情 API
 * GET /api/v1/admin/discussions/comments/[commentId] - 获取单个评论
 * DELETE /api/v1/admin/discussions/comments/[commentId] - 删除评论
 */

import { NextRequest } from 'next/server';
import { success, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isAuthError } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';

// GET /api/v1/admin/discussions/comments/[commentId] - 获取单个评论
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
): Promise<Response> {
  try {
    const { commentId } = await params;

    const comment = await prisma.discussionComment.findUnique({
      where: { id: commentId, isDeleted: false },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true } },
        discussion: { select: { id: true, title: true } },
      },
    });

    if (!comment) {
      return error(ErrorCodes.NOT_FOUND, { message: '评论不存在' });
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
  } catch (err) {
    return handlePrismaError(err, '获取评论失败');
  }
}

// DELETE /api/v1/admin/discussions/comments/[commentId] - 删除评论
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const { commentId } = await params;

    const existing = await prisma.discussionComment.findUnique({
      where: { id: commentId, isDeleted: false },
    });

    if (!existing) {
      return error(ErrorCodes.NOT_FOUND, { message: '评论不存在' });
    }

    await prisma.discussionComment.update({
      where: { id: commentId },
      data: { isDeleted: true },
    });

    return success({ id: commentId }, '评论已删除');
  } catch (err) {
    return handlePrismaError(err, '删除评论失败');
  }
}
