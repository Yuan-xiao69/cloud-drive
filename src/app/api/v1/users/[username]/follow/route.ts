export const dynamic = 'force-dynamic';
/**
 * v1 用户关注 API
 * POST /api/v1/users/[username]/follow - 关注/取消关注用户
 */

import { z } from 'zod';
import { defineRoute } from '@/lib/framework/define-route';
import { success } from '@/lib/api/v1';
import { UserService } from '@/services/user-service';

const followSchema = z.object({
  action: z.enum(['follow', 'unfollow']),
});

// POST /api/v1/users/[username]/follow - 关注/取消关注
export const POST = defineRoute({
  auth: 'required',
  validation: followSchema,
  async handler({ user, params, body }) {
    const { username } = params;
    const { action } = body;

    if (action === 'follow') {
      const result = await UserService.follow(user!.id, username);
      return success(result, '已关注用户');
    } else {
      const result = await UserService.unfollow(user!.id, username);
      return success(result, '已取消关注');
    }
  },
});
