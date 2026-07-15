export const dynamic = 'force-dynamic';
/**
 * v1 用户资料 API
 * GET /api/v1/users/[username] - 获取用户资料
 * PATCH /api/v1/users/[username] - 更新个人资料（需本人）
 */

import { z } from 'zod';
import { defineRoute } from '@/lib/framework/define-route';
import { success, error, ErrorCodes } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { UserService } from '@/services/user-service';

const updateProfileSchema = z.object({
  username: z.string().optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
  website: z.string().optional(),
  avatarUrl: z.string().optional(),
});

// GET /api/v1/users/[username] - 获取用户资料
export const GET = defineRoute({
  auth: 'optional',
  async handler({ user, params }) {
    const { username } = params;

    const isAdmin = user?.role === 'admin';

    const whereClause: Record<string, unknown> = { username };
    if (!isAdmin) {
      whereClause.isBanned = false;
    }

    const dbUser = await prisma.user.findFirst({
      where: whereClause,
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        bio: true,
        location: true,
        website: true,
        role: true,
        isBanned: true,
        mfaEnabled: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            repositories: { where: { deletedAt: null } },
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!dbUser) {
      return error(ErrorCodes.NOT_FOUND, { message: '用户不存在' });
    }

    return success({
      id: dbUser.id,
      username: dbUser.username,
      avatarUrl: dbUser.avatarUrl ?? undefined,
      bio: dbUser.bio ?? undefined,
      location: dbUser.location ?? undefined,
      website: dbUser.website ?? undefined,
      role: dbUser.role,
      isBanned: dbUser.isBanned,
      mfaEnabled: dbUser.mfaEnabled,
      createdAt: dbUser.createdAt.toISOString(),
      stats: {
        reposCount: dbUser._count.repositories,
        followersCount: dbUser._count.followers,
        followingCount: dbUser._count.following,
      },
    });
  },
});

// PATCH /api/v1/users/[username] - 更新个人资料
export const PATCH = defineRoute({
  auth: 'required',
  validation: updateProfileSchema,
  async handler({ user, body, params }) {
    const { username } = params;

    // 只能修改自己的资料 — 先获取目标用户 ID
    const dbUser = await prisma.user.findFirst({
      where: { username },
      select: { id: true },
    });

    if (!dbUser) {
      return error(ErrorCodes.NOT_FOUND, { message: '用户不存在' });
    }

    if (dbUser.id !== user!.id) {
      return error(ErrorCodes.FORBIDDEN, { message: '只能修改自己的资料' });
    }

    const updated = await UserService.updateProfile(user!.id, body);
    return success(updated, '资料更新成功');
  },
});
