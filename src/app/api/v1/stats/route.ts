export const dynamic = 'force-dynamic';

import { defineRoute } from '@/lib/framework/define-route';
import { success } from '@/lib/api/v1/response';
import { prisma } from '@/lib/prisma';

// GET /api/v1/stats - 公开的平台统计数据
export const GET = defineRoute({
  auth: 'none',
  async handler() {
    const [totalUsers, totalRepos, totalStars, totalDiscussions] = await Promise.all([
      prisma.user.count(),
      prisma.repository.count({ where: { deletedAt: null } }),
      prisma.star.count(),
      prisma.discussion.count({ where: { isDeleted: false } }),
    ]);

    return success({
      totalUsers,
      totalRepos,
      totalStars,
      totalDiscussions,
    });
  },
});
