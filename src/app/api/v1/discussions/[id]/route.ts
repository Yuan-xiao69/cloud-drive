export const dynamic = 'force-dynamic';
/**
 * v1 讨论详情 API
 * GET    /api/v1/discussions/[id] - 获取讨论详情
 * PUT    /api/v1/discussions/[id] - 更新讨论
 * DELETE /api/v1/discussions/[id] - 删除讨论
 */

import { z } from 'zod';
import { defineRoute } from '@/lib/framework/define-route';
import { success } from '@/lib/api/v1';
import { DiscussionService } from '@/services/discussion-service';
import { logActivity } from '@/lib/activity-log';

const updateDiscussionSchema = z.object({
  title: z.string().min(1, '标题不能为空').optional(),
  content: z.string().min(1, '内容不能为空').optional(),
  category: z.enum(['general', 'qa', 'share', 'suggestion', 'announce']).optional(),
  tags: z.array(z.string()).max(10).optional(),
});

// GET /api/v1/discussions/[id] - 获取讨论详情
export const GET = defineRoute({
  auth: 'optional',
  handler: async ({ user, params }) => {
    const { id } = params;

    const discussion = await DiscussionService.getById(id, user?.id);

    return success(discussion);
  },
});

// PUT /api/v1/discussions/[id] - 更新讨论
export const PUT = defineRoute({
  auth: 'required',
  rateLimit: 'default',
  validation: updateDiscussionSchema,
  handler: async ({ req, user, body, params }) => {
    const { id } = params;
    const { title, content, category, tags } = body;

    const updated = await DiscussionService.update(id, user!.id, {
      title,
      content,
      category,
      tags,
    });

    // 记录活动日志
    await logActivity({
      userId: user!.id,
      action: 'update_discussion',
      targetType: 'discussion',
      targetId: id,
      targetName: updated.title,
      req,
    });

    return success(updated, '讨论已更新');
  },
});

// DELETE /api/v1/discussions/[id] - 删除讨论
export const DELETE = defineRoute({
  auth: 'required',
  rateLimit: 'default',
  handler: async ({ req, user, params }) => {
    const { id } = params;

    await DiscussionService.delete(id, user!.id);

    // 记录活动日志
    await logActivity({
      userId: user!.id,
      action: 'delete_discussion',
      targetType: 'discussion',
      targetId: id,
      targetName: id,
      req,
    });

    return success({ id }, '讨论已删除');
  },
});
