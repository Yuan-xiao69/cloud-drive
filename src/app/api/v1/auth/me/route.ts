export const dynamic = 'force-dynamic';
import { defineRoute } from '@/lib/framework/define-route';
import { success, errors } from '@/lib/api/v1';
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
export const GET = defineRoute({
  auth: 'required',
  async handler({ user }) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user!.id },
      select: {
        id: true, username: true, email: true, avatarUrl: true,
        bio: true, role: true, isBanned: true, mfaEnabled: true,
        location: true, website: true, createdAt: true, updatedAt: true,
      },
    });

    if (!dbUser) {
      return errors.userNotFound();
    }

    if (dbUser.isBanned) {
      return errors.userBanned();
    }

    const userResponse: UserResponse = {
      id: dbUser.id,
      username: dbUser.username,
      email: dbUser.email,
      avatarUrl: dbUser.avatarUrl ?? undefined,
      bio: dbUser.bio ?? undefined,
      role: dbUser.role,
      isBanned: dbUser.isBanned,
      mfaEnabled: dbUser.mfaEnabled,
      location: dbUser.location ?? undefined,
      website: dbUser.website ?? undefined,
      createdAt: dbUser.createdAt.toISOString(),
      updatedAt: dbUser.updatedAt.toISOString(),
    };

    return success(userResponse, '获取用户信息成功');
  },
});
