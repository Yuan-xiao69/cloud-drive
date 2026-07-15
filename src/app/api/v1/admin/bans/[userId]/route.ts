export const dynamic = 'force-dynamic';
/**
 * v1 封禁详情 API（按用户）
 * GET /api/v1/admin/bans/[userId] - 获取用户的封禁记录
 * DELETE /api/v1/admin/bans/[userId] - 删除用户的所有封禁记录
 */

import { defineRoute } from '@/lib/framework/define-route';
import { success, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';

// GET /api/v1/admin/bans/[userId] - 获取用户的所有封禁记录
export const GET = defineRoute({
  auth: 'required',
  async handler({ req, user, params }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { userId } = params;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const now = new Date();

    const where: Record<string, unknown> = { userId };
    if (status === 'active') {
      where.isActive = true;
      where.OR = [
        { banType: 'permanent' },
        { banType: 'temporary', expiresAt: { gt: now } },
      ];
    } else if (status === 'expired') {
      where.isActive = false;
    }

    const bans = await prisma.userBan.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, email: true, avatarUrl: true } },
        banner: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const items = bans.map((ban) => {
      const isExpired = ban.banType === 'temporary' && ban.expiresAt && ban.expiresAt < now;
      return {
        id: ban.id,
        user: ban.user,
        banner: ban.banner,
        reason: ban.reason,
        banType: ban.banType,
        expiresAt: ban.expiresAt?.toISOString() ?? null,
        isActive: ban.isActive && !isExpired,
        isExpired,
        unbanReason: ban.unbanReason,
        unbannedAt: ban.unbannedAt?.toISOString() ?? null,
        unbannedBy: ban.unbannedBy,
        createdAt: ban.createdAt.toISOString(),
      };
    });

    return success({ bans: items, total: items.length });
  },
});

// DELETE /api/v1/admin/bans/[userId] - 删除用户的所有封禁记录
export const DELETE = defineRoute({
  auth: 'required',
  async handler({ user, params }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { userId } = params;

    await prisma.user.update({
      where: { id: userId },
      data: { isBanned: false },
    });

    await prisma.userBan.deleteMany({
      where: { userId },
    });

    return success({ userId }, '已解除该用户的所有封禁');
  },
});
