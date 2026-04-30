export const dynamic = 'force-dynamic';

/**
 * 用户数据导出 API
 * POST /api/v1/me/export
 */

import { NextRequest } from 'next/server';
import { success, error, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// POST /api/v1/me/export - 申请导出用户数据
export async function POST(
  req: NextRequest
): Promise<Response> {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return errors.UNAUTHORIZED();
    }

    const body = await req.json();
    const exportType: string = body.exportType || 'all';

    if (exportType === 'repos') {
      // 仅导出仓库元数据
      const repositories = await prisma.repository.findMany({
        where: { ownerId: auth.id, deletedAt: null },
        select: {
          id: true,
          name: true,
          description: true,
          visibility: true,
          starCount: true,
          forkCount: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return success({
        exportType: 'repos',
        count: repositories.length,
        data: repositories,
      });
    }

    // exportType === 'all'：导出所有数据
    const [user, repositories, discussions, comments, stars, activity] = await Promise.all([
      prisma.user.findUnique({
        where: { id: auth.id },
        select: {
          id: true,
          username: true,
          email: true,
          bio: true,
          location: true,
          website: true,
          createdAt: true,
          role: true,
        },
      }),
      prisma.repository.findMany({
        where: { ownerId: auth.id, deletedAt: null },
        select: {
          id: true,
          name: true,
          description: true,
          visibility: true,
          starCount: true,
          forkCount: true,
          createdAt: true,
        },
      }),
      prisma.discussion.findMany({
        where: { authorId: auth.id, isDeleted: false },
        select: {
          id: true,
          title: true,
          category: true,
          status: true,
          viewCount: true,
          createdAt: true,
        },
      }),
      prisma.discussionComment.findMany({
        where: { authorId: auth.id, isDeleted: false },
        select: {
          id: true,
          discussionId: true,
          content: true,
          isAccepted: true,
          createdAt: true,
        },
      }),
      prisma.star.findMany({
        where: { userId: auth.id },
        include: {
          repo: {
            select: {
              id: true,
              name: true,
              owner: { select: { username: true } },
            },
          },
        },
      }),
      prisma.userActivityLog.findMany({
        where: { userId: auth.id },
        orderBy: { createdAt: 'desc' },
        take: 1000,
        select: {
          id: true,
          action: true,
          targetType: true,
          targetName: true,
          createdAt: true,
        },
      }),
    ]);

    return success({
      exportType: 'all',
      profile: user,
      repositories,
      discussions,
      comments,
      stars,
      activity,
    });
  } catch (err) {
    console.error('[Export] POST Error:', err);
    return errors.INTERNAL_SERVER_ERROR();
  }
}
