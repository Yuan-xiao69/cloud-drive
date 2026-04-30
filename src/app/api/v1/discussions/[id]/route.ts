export const dynamic = 'force-dynamic';
/**
 * v1 讨论详情 API
 * GET /api/v1/discussions/[id] - 获取讨论详情
 */

import { NextRequest } from 'next/server';
import { success, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';

// GET /api/v1/discussions/[id] - 获取讨论详情
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;
    const auth = await getAuthUser(req);

    // 查找讨论
    const discussion = await prisma.discussion.findUnique({
      where: { id, isDeleted: false },
      include: {
        author: {
          select: { id: true, username: true, avatarUrl: true, bio: true },
        },
        _count: {
          select: {
            comments: { where: { isDeleted: false } },
            likes: true,
          },
        },
      },
    });

    if (!discussion) {
      return error(ErrorCodes.NOT_FOUND, { message: '讨论不存在' });
    }

    // 增加浏览计数
    await prisma.discussion.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    // 检查当前用户是否已点赞
    let isLiked = false;
    if (auth) {
      const existingLike = await prisma.discussionLike.findUnique({
        where: {
          discussionId_userId: {
            discussionId: id,
            userId: auth.userId,
          },
        },
      });
      isLiked = !!existingLike;
    }

    return success({
      id: discussion.id,
      authorId: discussion.authorId,
      author: {
        id: discussion.author.id,
        username: discussion.author.username,
        avatarUrl: discussion.author.avatarUrl ?? undefined,
        bio: discussion.author.bio ?? undefined,
      },
      title: discussion.title,
      content: discussion.content,
      category: discussion.category,
      status: discussion.status,
      viewCount: discussion.viewCount + 1, // 返回更新后的浏览数
      likeCount: discussion._count.likes,
      commentsCount: discussion._count.comments,
      isLiked,
      createdAt: discussion.createdAt.toISOString(),
      updatedAt: discussion.updatedAt.toISOString(),
    });
  } catch (err) {
    return handlePrismaError(err, '获取讨论详情失败');
  }
}
