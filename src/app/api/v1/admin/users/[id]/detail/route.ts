export const dynamic = 'force-dynamic';

/**
 * v1 用户详情 API
 * GET /api/v1/admin/users/[id]/detail - 获取用户详情
 */

import { NextRequest } from 'next/server';
import { success, handlePrismaError, errors } from '@/lib/api/v1';
import { requireAdmin, isAuthError, recordAuditLog } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/v1/admin/users/[id]/detail - 获取用户详情
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const resolvedParams = await params;
    const userId = resolvedParams.id;

    // 获取用户基本信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        bio: true,
        location: true,
        website: true,
        role: true,
        isSystem: true,
        isBanned: true,
        createdAt: true,
        // 获取统计数据
        _count: {
          select: {
            repositories: true,
            discussions: true,
            prComments: true,
            stars: true,
          },
        },
      },
    });

    if (!user) {
      return errors.notFound('用户');
    }

    // 获取用户的活跃度数据（最近30天）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentActivity = await prisma.userActivityLog.count({
      where: {
        userId: userId,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    // 获取用户的处罚记录
    const penalties = await prisma.userPenalty.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        penaltyType: true,
        reason: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
        applier: {
          select: { username: true },
        },
      },
    });

    // 获取用户的最近登录记录（从 LoginHistory）
    const recentLogins = await prisma.loginHistory.findMany({
      where: {
        userId: userId,
        success: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        createdAt: true,
        ipAddress: true,
        userAgent: true,
      },
    });

    // 计算活跃度评分（基于最近活动）
    const activityRate = Math.min(100, Math.round(
      (recentActivity / 30) * 50 +
      (user._count.discussions > 0 || user._count.prComments > 0 ? 20 : 0)
    ));

    // 判断用户状态
    const status = user.isBanned 
      ? 'banned' 
      : penalties.some(p => p.isActive && p.penaltyType === 'mute')
        ? 'muted'
        : penalties.some(p => p.isActive)
          ? 'restricted'
          : 'normal';

    return success({
      id: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      location: user.location,
      website: user.website,
      role: user.role,
      isSystem: user.isSystem,
      isBanned: user.isBanned,
      createdAt: user.createdAt,
      stats: {
        repos: user._count.repositories,
        discussions: user._count.discussions,
        comments: user._count.prComments,
        stars: user._count.stars,
      },
      activityRate,
      activeDaysLast30: recentActivity,
      penalties: penalties.map(p => ({
        id: p.id,
        type: p.penaltyType,
        reason: p.reason,
        status: p.isActive ? 'active' : 'inactive',
        expiresAt: p.expiresAt,
        createdAt: p.createdAt,
        applierUsername: p.applier.username,
      })),
      recentLogins: recentLogins.map((log: { id: string; createdAt: Date; ipAddress: string | null; userAgent: string | null }) => ({
        id: log.id,
        time: log.createdAt,
        ip: log.ipAddress,
        userAgent: log.userAgent,
      })),
      status,
    });
  } catch (err) {
    console.error('获取用户详情失败:', err);
    return handlePrismaError(err);
  }
}
