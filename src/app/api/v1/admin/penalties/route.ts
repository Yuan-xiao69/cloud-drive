export const dynamic = 'force-dynamic';
/**
 * v1 处罚管理 API
 * GET /api/v1/admin/penalties - 获取处罚列表
 * POST /api/v1/admin/penalties - 添加处罚
 */

import { NextRequest } from 'next/server';
import { success, created, paginated, handlePrismaError, errors, buildPaginationMeta } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isAuthError, recordAuditLog } from '@/lib/auth';

// GET /api/v1/admin/penalties - 获取处罚列表
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
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
  } catch (err) {
    return handlePrismaError(err);
  }
}

// POST /api/v1/admin/penalties - 添加处罚
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const body = await req.json();
    const { userId, penaltyType, reason, value, expiresDays } = body;

    if (!userId || !penaltyType || !reason) {
      return errors.badRequest('缺少必填字段');
    }

    const validTypes = ['mute', 'repo_limit', 'storage_limit'];
    if (!validTypes.includes(penaltyType)) {
      return errors.badRequest('无效的处罚类型');
    }

    // 检查目标用户
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

    if (userId === auth.userId) {
      return errors.forbidden('不能对自己添加处罚');
    }

    // 计算过期时间
    const expiresAt = expiresDays ? new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000) : null;

    const penalty = await prisma.userPenalty.create({
      data: {
        userId,
        penaltyType,
        reason,
        value: value || 0,
        appliedBy: auth.userId,
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

    // 记录审计日志
    await recordAuditLog({
      adminId: auth.userId,
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
  } catch (err) {
    return handlePrismaError(err);
  }
}
