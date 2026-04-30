export const dynamic = 'force-dynamic';
/**
 * v1 封禁详情 API（按用户）
 * GET /api/v1/admin/bans/[userId] - 获取用户的封禁记录
 * DELETE /api/v1/admin/bans/[userId] - 删除用户的所有封禁记录
 */

import { NextRequest } from 'next/server';
import { success, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isAuthError } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';

// GET /api/v1/admin/bans/[userId] - 获取用户的所有封禁记录
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const { userId } = await params;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // active | expired | all

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
  } catch (err) {
    return handlePrismaError(err, '获取封禁记录失败');
  }
}

// DELETE /api/v1/admin/bans/[userId] - 删除用户的所有封禁记录
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const { userId } = await params;

    // 解封用户
    await prisma.user.update({
      where: { id: userId },
      data: { isBanned: false },
    });

    // 删除所有封禁记录
    await prisma.userBan.deleteMany({
      where: { userId },
    });

    return success({ userId }, '已解除该用户的所有封禁');
  } catch (err) {
    return handlePrismaError(err, '删除封禁记录失败');
  }
}
