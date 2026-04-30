export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { success, handlePrismaError } from '@/lib/api/v1/response';
import { prisma } from '@/lib/prisma';


// GET /api/v1/stats - 公开的平台统计数据
export async function GET(req: NextRequest) {
  try {
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
  } catch (error) {
    return handlePrismaError(error);
  }
}
