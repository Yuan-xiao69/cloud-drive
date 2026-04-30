export const dynamic = 'force-dynamic';
/**
 * v1 讨论点赞 API
 * GET /api/v1/discussions/[id]/like - 获取点赞状态
 * POST /api/v1/discussions/[id]/like - 点赞
 * DELETE /api/v1/discussions/[id]/like - 取消点赞
 */

import { NextRequest } from 'next/server';
import { success, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';

// GET /api/v1/discussions/[id]/like - 获取点赞状态
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
      select: {
        id: true,
        _count: { select: { likes: true } },
      },
    });

    if (!discussion) {
      return error(ErrorCodes.NOT_FOUND, { message: '讨论不存在' });
    }

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
      isLiked,
      likeCount: discussion._count.likes,
    });
  } catch (err) {
    return handlePrismaError(err, '获取点赞状态失败');
  }
}

// POST /api/v1/discussions/[id]/like - 点赞
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;
    const auth = await getAuthUser(req);
    if (!auth) {
      return errors.unauthorized();
    }

    // 查找讨论
    const discussion = await prisma.discussion.findUnique({
      where: { id, isDeleted: false },
      select: { id: true, _count: { select: { likes: true } } },
    });

    if (!discussion) {
      return error(ErrorCodes.NOT_FOUND, { message: '讨论不存在' });
    }

    // 检查是否已点赞
    const existingLike = await prisma.discussionLike.findUnique({
      where: {
        discussionId_userId: {
          discussionId: id,
          userId: auth.userId,
        },
      },
    });

    if (existingLike) {
      return success({
        isLiked: true,
        likeCount: discussion._count?.likes ?? 0,
      }, '已经点赞过了');
    }

    // 创建点赞
    await prisma.discussionLike.create({
      data: {
        discussionId: id,
        userId: auth.userId,
      },
    });

    const likeCount = await prisma.discussionLike.count({
      where: { discussionId: id },
    });

    return success({
      isLiked: true,
      likeCount,
    }, '点赞成功');
  } catch (err) {
    return handlePrismaError(err, '点赞失败');
  }
}

// DELETE /api/v1/discussions/[id]/like - 取消点赞
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;
    const auth = await getAuthUser(req);
    if (!auth) {
      return errors.unauthorized();
    }

    // 查找点赞记录
    const existingLike = await prisma.discussionLike.findUnique({
      where: {
        discussionId_userId: {
          discussionId: id,
          userId: auth.userId,
        },
      },
    });

    if (!existingLike) {
      return success({
        isLiked: false,
        likeCount: 0,
      }, '还没有点赞');
    }

    // 删除点赞
    await prisma.discussionLike.delete({
      where: { id: existingLike.id },
    });

    const likeCount = await prisma.discussionLike.count({
      where: { discussionId: id },
    });

    return success({
      isLiked: false,
      likeCount,
    }, '已取消点赞');
  } catch (err) {
    return handlePrismaError(err, '取消点赞失败');
  }
}
