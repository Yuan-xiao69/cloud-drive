export const dynamic = 'force-dynamic';
/**
 * API v1 - 讨论评论操作 API
 * DELETE /api/v1/discussions/[id]/comments/[commentId] - 删除评论
 */

import { defineRoute } from '@/lib/framework/define-route';
import { success } from '@/lib/api/v1';
import { DiscussionService } from '@/services/discussion-service';
import { logActivity } from '@/lib/activity-log';

// DELETE /api/v1/discussions/[id]/comments/[commentId] - 删除评论
export const DELETE = defineRoute({
  auth: 'required',
  rateLimit: 'default',
  handler: async ({ req, user, params }) => {
    const { commentId } = params;

    await DiscussionService.deleteComment(commentId, user!.id);

    // 记录活动日志
    await logActivity({
      userId: user!.id,
      action: 'delete_comment',
      targetType: 'discussion_comment',
      targetId: commentId,
      targetName: commentId,
      req,
    });

    return success({ id: commentId }, '评论已删除');
  },
});
