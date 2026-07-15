export const dynamic = 'force-dynamic';
/**
 * v1 处罚管理 API
 * GET /api/v1/admin/penalties - 获取处罚列表
 * POST /api/v1/admin/penalties - 添加处罚
 */

import { defineRoute } from '@/lib/framework/define-route';
import { z } from 'zod';
import { success, created, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { recordAuditLog } from '@/lib/auth';

// GET /api/v1/admin/penalties - 获取处罚列表
export const GET = defineRoute({
  auth: 'required',
  async handler({ req, user }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const penaltyType = searchParams.get('type');
    const isActive = searchParams.get('isActive');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // 构建查询条件
    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (penaltyType) where.penaltyType = penaltyType;
    if (isActive !== null) where.isActive = isActive === 'true';

    const [penalties, total] = await Promise.all([
      prisma.userPenalty.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              avatarUrl: true,
              role: true,
              isSystem: true,
            },
          },
          applier: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.userPenalty.count({ where }),
    ]);

    // 获取每个处罚的申诉状态
    const penaltyIds = penalties.map(p => p.id);
    const appeals = await prisma.appeal.findMany({
      where: {
        targetId: { in: penaltyIds },
        appealType: 'penalty',
      },
      select: {
        id: true,
        targetId: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            username: true,
          },
        },
      },
    });

    // 按 targetId 分组申诉
    const appealsByPenaltyId = appeals.reduce((acc, appeal) => {
      if (!acc[appeal.targetId]) {
        acc[appeal.targetId] = [];
      }
      acc[appeal.targetId].push({
        id: appeal.id,
        status: appeal.status,
        createdAt: appeal.createdAt,
        username: appeal.user.username,
      });
      return acc;
    }, {} as Record<string, Array<{ id: string; status: string; createdAt: Date; username: string }>>);

    // 格式化数据
    const formattedPenalties = penalties.map((p) => ({
      id: p.id,
      userId: p.userId,
      user: p.user,
      penaltyType: p.penaltyType,
      reason: p.reason,
      value: p.value,
      appliedBy: p.appliedBy,
      applier: p.applier,
      isActive: p.isActive,
      expiresAt: p.expiresAt,
      removedAt: p.removedAt,
      removedBy: p.removedBy,
      removeReason: p.removeReason,
      createdAt: p.createdAt,
      status: !p.isActive ? 'removed' : (p.expiresAt && new Date() > p.expiresAt ? 'expired' : 'active'),
      remainingDays: p.expiresAt
        ? Math.max(0, Math.ceil((p.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : null,
      appeals: appealsByPenaltyId[p.id] || [],
      hasPendingAppeal: (appealsByPenaltyId[p.id] || []).some(a => a.status === 'pending'),
    }));

    return success({
      items: formattedPenalties,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  },
});

// POST /api/v1/admin/penalties - 添加处罚
export const POST = defineRoute({
  auth: 'required',
  validation: z.object({
    userId: z.string(),
    penaltyType: z.string(),
    reason: z.string(),
    value: z.number().optional().default(0),
    expiresDays: z.number().optional(),
  }),
  async handler({ req, user, body }) {
    if (user!.role !== 'admin' && user!.role !== 'super_admin') {
      return errors.forbidden('无权限访问管理面板');
    }

    const { userId, penaltyType, reason, value, expiresDays } = body;

    const validTypes = ['mute', 'repo_limit', 'storage_limit'];
    if (!validTypes.includes(penaltyType)) {
      return errors.badRequest('无效的处罚类型');
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, isSystem: true, role: true },
    });

    if (!targetUser) {
      return errors.notFound('用户');
    }

    if (targetUser.isSystem) {
      return errors.forbidden('不能对系统内置用户添加处罚');
    }

    if (userId === user!.id) {
      return errors.forbidden('不能对自己添加处罚');
    }

    const expiresAt = expiresDays ? new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000) : null;

    const penalty = await prisma.userPenalty.create({
      data: {
        userId,
        penaltyType,
        reason,
        value: value || 0,
        appliedBy: user!.id,
        expiresAt,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
          },
        },
        applier: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    // TODO: 将 recordAuditLog 迁移到 AsyncJob.enqueue('record_audit', {...})
    await recordAuditLog({
      adminId: user!.id,
      actionType: 'penalty_create',
      targetType: 'user',
      targetId: userId,
      details: { penaltyId: penalty.id, penaltyType, reason, value, expiresDays },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
    });

    return created({
      penalty: {
        ...penalty,
        status: 'active',
        remainingDays: expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
      },
    }, '处罚添加成功');
  },
});
