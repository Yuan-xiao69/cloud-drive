export const dynamic = 'force-dynamic';
/**
 * v1 封禁管理 API
 * GET /api/v1/admin/bans - 获取封禁列表
 * POST /api/v1/admin/bans - 添加封禁
 * PUT /api/v1/admin/bans - 解封用户
 * DELETE /api/v1/admin/bans - 删除封禁记录
 */

import { NextRequest } from 'next/server';
import { success, paginated, handlePrismaError, errors, parsePagination, buildPaginationMeta } from '@/lib/api/v1';
import { requireAdmin, isAuthError, recordAuditLog } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/v1/admin/bans - 获取封禁列表
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const sp = req.nextUrl.searchParams;
    const { page, size, skip } = parsePagination(sp);
    const keyword = sp.get('keyword')?.trim() || undefined;
    const status = sp.get('status');
    const banType = sp.get('banType');

    const where: Record<string, unknown> = {};

    // 使用 AND 数组将各过滤条件形成交集
    const andConditions: Record<string, unknown>[] = [];

    // 用户过滤条件（keyword）
    if (keyword) {
      andConditions.push({
        user: {
          OR: [
            { username: { contains: keyword, mode: 'insensitive' } },
            { email: { contains: keyword, mode: 'insensitive' } },
          ],
        },
      });
    }

    // 状态过滤条件
    if (status === 'active') {
      andConditions.push({
        isActive: true,
        OR: [
          { banType: 'permanent' },
          { banType: 'temporary', expiresAt: { gt: new Date() } },
        ],
      });
    } else if (status === 'expired') {
      andConditions.push({
        isActive: false,
      });
    }

    // 将 AND 条件赋值给 where
    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    if (banType && banType !== 'all') {
      where.banType = banType;
    }

    const [bans, total, orphanedBans] = await Promise.all([
      prisma.userBan.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              avatarUrl: true,
              uid: true,
            },
          },
          banner: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: size,
      }),
      prisma.userBan.count({ where }),
      (status === 'all' || status === 'active') ? prisma.user.findMany({
        where: {
          isBanned: true,
          isSystem: false,
          ...(keyword ? {
            OR: [
              { username: { contains: keyword, mode: 'insensitive' } },
              { email: { contains: keyword, mode: 'insensitive' } },
            ],
          } : {}),
        },
        select: {
          id: true,
          username: true,
          email: true,
          avatarUrl: true,
          uid: true,
        },
      }) : Promise.resolve([]),
    ]);

    const now = new Date();
    const items = bans.map((ban) => {
      const isExpired = ban.banType === 'temporary' && ban.expiresAt && ban.expiresAt < now;
      return {
        id: ban.id,
        user: {
          id: ban.user.id,
          username: ban.user.username,
          email: ban.user.email,
          avatarUrl: ban.user.avatarUrl,
          uid: ban.user.uid,
        },
        banner: {
          id: ban.banner.id,
          username: ban.banner.username,
          email: ban.banner.email,
        },
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

    if (orphanedBans && orphanedBans.length > 0) {
      const existingBanUserIds = new Set(bans.map(b => b.userId));
      const orphanedItems = orphanedBans
        .filter(u => !existingBanUserIds.has(u.id))
        .map(user => ({
          id: `orphaned-${user.id}`,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            avatarUrl: user.avatarUrl,
            uid: user.uid,
          },
          banner: {
            id: 'deleted',
            username: '[已删除]',
            email: '',
          },
          reason: '系统记录',
          banType: 'unknown' as const,
          expiresAt: null,
          isActive: true,
          isExpired: false,
          isOrphaned: true,
          unbanReason: null,
          unbannedAt: null,
          unbannedBy: null,
          createdAt: new Date().toISOString(),
        })) as typeof items;
      items.push(...orphanedItems);
    }

    const pagination = buildPaginationMeta(total, page, size);
    return paginated(items, pagination);
  } catch (err) {
    return handlePrismaError(err);
  }
}

// POST /api/v1/admin/bans - 添加封禁
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const body = await req.json();
    const { userId, reason, banType = 'permanent', expiresAt } = body;

    if (!userId || !reason) {
      return errors.badRequest('缺少必填字段：userId, reason');
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, isSystem: true },
    });

    if (!targetUser) {
      return errors.notFound('用户');
    }

    if (targetUser.isSystem) {
      return errors.forbidden('无法封禁系统内置账号');
    }

    if (targetUser.id === auth.userId) {
      return errors.forbidden('无法封禁自己');
    }

    if (banType !== 'permanent' && banType !== 'temporary') {
      return errors.badRequest('无效的封禁类型');
    }

    if (banType === 'temporary' && !expiresAt) {
      return errors.badRequest('临时封禁必须设置过期时间');
    }

    const existingBan = await prisma.userBan.findFirst({
      where: {
        userId,
        isActive: true,
        OR: [
          { banType: 'permanent' },
          { banType: 'temporary', expiresAt: { gt: new Date() } },
        ],
      },
    });

    if (existingBan) {
      return errors.conflict('该用户已被封禁，请先解除现有封禁');
    }

    const ban = await prisma.userBan.create({
      data: {
        userId,
        bannerId: auth.userId,
        reason,
        banType,
        expiresAt: banType === 'temporary' ? new Date(expiresAt) : null,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { isBanned: true },
    });

    await recordAuditLog({
      adminId: auth.userId,
      actionType: 'create_ban',
      targetType: 'user',
      targetId: userId,
      details: { reason, banType, expiresAt },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
    });

    return success({
      id: ban.id,
      userId: ban.userId,
      username: ban.user.username,
      reason: ban.reason,
      banType: ban.banType,
      expiresAt: ban.expiresAt?.toISOString() ?? null,
      isActive: ban.isActive,
      createdAt: ban.createdAt.toISOString(),
    }, '用户已被封禁');
  } catch (err) {
    return handlePrismaError(err);
  }
}

// PUT /api/v1/admin/bans - 解封用户
export async function PUT(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const body = await req.json();
    const { userId, unbanReason } = body;

    if (!userId || !unbanReason) {
      return errors.badRequest('缺少必填字段：userId, unbanReason');
    }

    const existingBan = await prisma.userBan.findFirst({
      where: {
        userId,
        isActive: true,
      },
    });

    if (!existingBan) {
      return errors.notFound('未找到该用户的活跃封禁记录');
    }

    await prisma.userBan.update({
      where: { id: existingBan.id },
      data: {
        isActive: false,
        unbanReason,
        unbannedAt: new Date(),
        unbannedBy: auth.userId,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { isBanned: false },
    });

    await recordAuditLog({
      adminId: auth.userId,
      actionType: 'remove_ban',
      targetType: 'user',
      targetId: userId,
      details: { unbanReason, previousBanId: existingBan.id },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
    });

    return success({ userId }, '用户已解封');
  } catch (err) {
    return handlePrismaError(err);
  }
}

// DELETE /api/v1/admin/bans - 删除封禁记录
export async function DELETE(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const sp = req.nextUrl.searchParams;
    const banId = sp.get('id');

    if (!banId) {
      return errors.badRequest('缺少封禁记录ID');
    }

    const ban = await prisma.userBan.findUnique({
      where: { id: banId },
    });

    if (!ban) {
      return errors.notFound('封禁记录');
    }

    // 使用事务保证"删除记录 + 解封用户"的原子性
    await prisma.$transaction(async (tx) => {
      // 先删除封禁记录
      await tx.userBan.delete({
        where: { id: banId },
      });

      // 再解封用户
      if (ban.isActive) {
        await tx.user.update({
          where: { id: ban.userId },
          data: { isBanned: false },
        });
      }
    });

    await recordAuditLog({
      adminId: auth.userId,
      actionType: 'delete_ban_record',
      targetType: 'user_ban',
      targetId: banId,
      details: { bannedUserId: ban.userId },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
    });

    return success({ banId }, '封禁记录已删除');
  } catch (err) {
    return handlePrismaError(err);
  }
}
