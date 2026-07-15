export const dynamic = 'force-dynamic';
/**
 * v1 讨论点赞 API
 * GET    /api/v1/discussions/[id]/like - 获取点赞状态
 * POST   /api/v1/discussions/[id]/like - 点赞
 * DELETE /api/v1/discussions/[id]/like - 取消点赞
 */

import { defineRoute } from '@/lib/framework/define-route';
import { success } from '@/lib/api/v1';
import { DiscussionService } from '@/services/discussion-service';

// GET /api/v1/discussions/[id]/like - 获取点赞状态
export const GET = defineRoute({
  auth: 'optional',
  handler: async ({ user, params }) => {
    const { id } = params;

    // 查找讨论并获取点赞信息
    const discussion = await DiscussionService.getById(id, user?.id);

    return success({
      isLiked: discussion.isLiked,
      likeCount: discussion.likeCount,
    });
  },
});

// POST /api/v1/discussions/[id]/like - 点赞
export const POST = defineRoute({
  auth: 'required',
  rateLimit: 'auth',
  handler: async ({ user, params }) => {
    const { id } = params;

    const result = await DiscussionService.toggleLike(id, user!.id);

    if (result.action === 'unliked') {
      return success(
        { isLiked: result.isLiked, likeCount: result.likeCount },
        '已经点赞过了',
      );
    }

    return success(
      { isLiked: result.isLiked, likeCount: result.likeCount },
      '点赞成功',
    );
  },
});

// DELETE /api/v1/discussions/[id]/like - 取消点赞
export const DELETE = defineRoute({
  auth: 'required',
  handler: async ({ user, params }) => {
    const { id } = params;

    const result = await DiscussionService.toggleLike(id, user!.id);

    if (result.action === 'liked') {
      return success(
        { isLiked: result.isLiked, likeCount: result.likeCount },
        '还没有点赞',
      );
    }

    return success(
      { isLiked: result.isLiked, likeCount: result.likeCount },
      '已取消点赞',
    );
  },
});
