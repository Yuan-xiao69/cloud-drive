export const dynamic = 'force-dynamic';
/**
 * API v1 - 用户拉黑 API
 * GET /api/v1/users/[username]/block - 检查拉黑状态
 * POST /api/v1/users/[username]/block - 拉黑/取消拉黑
 */

import { z } from 'zod';
import { defineRoute } from '@/lib/framework/define-route';
import { success } from '@/lib/api/v1/response';
import { prisma } from '@/lib/prisma';
import { UserService } from '@/services/user-service';

const blockSchema = z.object({
  action: z.enum(['block', 'unblock']),
});

// GET /api/v1/users/[username]/block - 检查当前用户是否拉黑了目标用户
export const GET = defineRoute({
  auth: 'required',
  async handler({ user, params }) {
    const { username } = params;

    // 查找目标用户
    const targetUser = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!targetUser) {
      return success({ isBlocked: false });
    }

    // 检查拉黑状态
    const block = await prisma.userBlock.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: user!.id,
          blockedId: targetUser.id,
        },
      },
      select: { id: true },
    });

    return success({ isBlocked: !!block });
  },
});

// POST /api/v1/users/[username]/block - 拉黑/取消拉黑
export const POST = defineRoute({
  auth: 'required',
  rateLimit: 'default',
  validation: blockSchema,
  async handler({ user, body, params }) {
    const { username } = params;
    const { action } = body;

    if (action === 'block') {
      const result = await UserService.block(user!.id, username);
      return success(result, '拉黑成功');
    } else {
      const result = await UserService.unblock(user!.id, username);
      return success(result, '取消拉黑成功');
    }
  },
});
