export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { success, errors, handlePrismaError, getRequestId } from '@/lib/api/v1';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface UserResponse {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  role: string;
  isBanned: boolean;
  mfaEnabled: boolean;
  location?: string;
  website?: string;
  createdAt: string;
  updatedAt: string;
}

// GET /api/v1/auth/me
export async function GET(req: NextRequest) {
  const requestId = getRequestId(req);

  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return errors.unauthorized('未登录或 Token 已过期', requestId);
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
    });

    if (!user) {
      return errors.userNotFound(undefined, requestId);
    }

    if (user.isBanned) {
      return errors.userBanned(requestId);
    }

    const userResponse: UserResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl ?? undefined,
      bio: user.bio ?? undefined,
      role: user.role,
      isBanned: user.isBanned,
      mfaEnabled: user.mfaEnabled,
      location: user.location ?? undefined,
      website: user.website ?? undefined,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };

    return success(userResponse, '获取用户信息成功');
  } catch (error) {
    console.error('[v1/auth/me] Error:', error);
    return handlePrismaError(error, requestId);
  }
}
