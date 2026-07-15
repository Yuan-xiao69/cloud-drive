export const dynamic = 'force-dynamic';
/**
 * v1 封禁管理 API
 * GET /api/v1/admin/bans - 获取封禁列表
 * POST /api/v1/admin/bans - 添加封禁
 * PUT /api/v1/admin/bans - 解封用户
 * DELETE /api/v1/admin/bans - 删除封禁记录
 */

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { paginated, errors, parsePagination, buildPaginationMeta, success } from '@/lib/api/v1';
import { recordAuditLog } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BanService } from '@/services/ban-service';

// GET /api/v1/admin/bans - 获取封禁列表
export const GET = defineRoute({
  auth: 'required',
  async handler({ req, user }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
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
  },
});

// POST /api/v1/admin/bans - 添加封禁
export const POST = defineRoute({
  auth: 'required',
  validation: z.object({
    userId: z.string(),
    reason: z.string(),
    banType: z.enum(['permanent', 'temporary']).optional().default('permanent'),
    expiresAt: z.string().optional(),
  }),
  async handler({ req, user, body }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { userId, reason, banType = 'permanent', expiresAt } = body;

    if (banType === 'temporary' && !expiresAt) {
      return errors.badRequest('临时封禁必须设置过期时间');
    }

    const ipAddress =
      req.headers.get('x-forwarded-for') ||
      req.headers.get('x-real-ip') ||
      undefined;

    const ban = await BanService.execute(
      user!.id,
      userId,
      reason,
      banType as 'permanent' | 'temporary',
      expiresAt,
      ipAddress,
    );

    return success(ban, '用户已被封禁');
  },
});

// PUT /api/v1/admin/bans - 解封用户
export const PUT = defineRoute({
  auth: 'required',
  validation: z.object({
    userId: z.string(),
    unbanReason: z.string(),
  }),
  async handler({ req, user, body }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { userId, unbanReason } = body;

    // 查找目标用户的活跃封禁记录以获取 banId
    const existingBan = await prisma.userBan.findFirst({
      where: { userId, isActive: true },
      select: { id: true },
    });

    if (!existingBan) {
      return errors.notFound('未找到该用户的活跃封禁记录');
    }

    const ipAddress =
      req.headers.get('x-forwarded-for') ||
      req.headers.get('x-real-ip') ||
      undefined;

    const result = await BanService.revoke(
      existingBan.id,
      user!.id,
      unbanReason,
      ipAddress,
    );

    return success(result, '用户已解封');
  },
});

// DELETE /api/v1/admin/bans - 删除封禁记录
export const DELETE = defineRoute({
  auth: 'required',
  async handler({ req, user }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
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

    await prisma.$transaction(async (tx) => {
      await tx.userBan.delete({
        where: { id: banId },
      });

      if (ban.isActive) {
        await tx.user.update({
          where: { id: ban.userId },
          data: { isBanned: false },
        });
      }
    });

    // TODO: 将 recordAuditLog 迁移到 AsyncJob.enqueue('record_audit', {...})
    await recordAuditLog({
      adminId: user!.id,
      actionType: 'delete_ban_record',
      targetType: 'user_ban',
      targetId: banId,
      details: { bannedUserId: ban.userId },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
    });

    return success({ banId }, '封禁记录已删除');
  },
});
