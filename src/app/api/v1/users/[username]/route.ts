export const dynamic = 'force-dynamic';
/**
 * v1 用户资料 API
 * GET /api/v1/users/[username] - 获取用户资料
 * PATCH /api/v1/users/[username] - 更新个人资料（需本人）
 */

import { NextRequest } from 'next/server';
import { success, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getAuthUser, requireAdmin, isAuthError } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';

// GET /api/v1/users/[username] - 获取用户资料
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
): Promise<Response> {
  try {
    const { username } = await params;

    const user = await prisma.user.findFirst({
      where: { username },
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

    if (!user) {
      return error(ErrorCodes.NOT_FOUND, { message: '用户不存在' });
    }

    return success({
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl ?? undefined,
      bio: user.bio ?? undefined,
      location: user.location ?? undefined,
      website: user.website ?? undefined,
      role: user.role,
      isBanned: user.isBanned,
      mfaEnabled: user.mfaEnabled,
      createdAt: user.createdAt.toISOString(),
      stats: {
        reposCount: user._count.repositories,
        followersCount: user._count.followers,
        followingCount: user._count.following,
      },
    });
  } catch (err) {
    return handlePrismaError(err, '获取用户资料失败');
  }
}

// PATCH /api/v1/users/[username] - 更新个人资料
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
): Promise<Response> {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return errors.unauthorized();
    }

    const { username } = await params;

    // 只能修改自己的资料
    const user = await prisma.user.findFirst({
      where: { username },
      select: { id: true, username: true },
    });

    if (!user) {
      return error(ErrorCodes.NOT_FOUND, { message: '用户不存在' });
    }

    if (user.id !== auth.userId) {
      return error(ErrorCodes.FORBIDDEN, { message: '只能修改自己的资料' });
    }

    const body = await req.json();
    const { bio, location, website, avatarUrl } = body;

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(bio !== undefined && { bio }),
        ...(location !== undefined && { location }),
        ...(website !== undefined && { website }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        bio: true,
        location: true,
        website: true,
        updatedAt: true,
      },
    });

    return success(updated, '资料更新成功');
  } catch (err) {
    return handlePrismaError(err, '更新资料失败');
  }
}
