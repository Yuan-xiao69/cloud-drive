export const dynamic = 'force-dynamic';
/**
 * v1 申诉管理 API（管理员端）
 * GET /api/v1/admin/appeals - 获取申诉列表
 */

import { NextRequest } from 'next/server';
import { success, paginated, handlePrismaError, buildPaginationMeta } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isAuthError } from '@/lib/auth';

// GET /api/v1/admin/appeals - 获取申诉列表
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const authResult = await requireAdmin(req);
    if (isAuthError(authResult)) {
      return authResult.error;
    }

    const { searchParams } = new URL(req.url);
    const appealType = searchParams.get('type');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('size') || '20');
    const userId = searchParams.get('userId');
    const includeHistory = searchParams.get('includeHistory') === 'true';

    // 构建查询条件
    const where: Record<string, unknown> = {};
    if (appealType) where.appealType = appealType;
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const [appeals, total] = await Promise.all([
      prisma.appeal.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              avatarUrl: true,
              role: true,
            },
          },
          reviewer: {
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
      prisma.appeal.count({ where }),
    ]);

    // 如果需要历史申诉统计，获取该用户的所有申诉记录
    let userAppealHistory: Array<{
      appealType: string;
      status: string;
      createdAt: Date;
      reviewedAt: Date | null;
      reviewer: { username: string } | null;
    }> = [];

    if (includeHistory && userId) {
      const historyAppeals = await prisma.appeal.findMany({
        where: { userId },
        select: {
          appealType: true,
          status: true,
          createdAt: true,
          reviewedAt: true,
          reviewer: {
            select: { username: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      userAppealHistory = historyAppeals;
    }

    // 格式化数据，获取关联的详细内容
    const formattedAppeals = await Promise.all(
      appeals.map(async (appeal) => {
        let targetInfo = null;

        try {
          switch (appeal.appealType) {
            case 'ban': {
              const ban = await prisma.userBan.findUnique({
                where: { id: appeal.targetId },
                include: { user: { select: { username: true } } },
              });
              if (ban) {
                targetInfo = {
                  type: 'ban',
                  user: ban.user?.username,
                  reason: ban.reason,
                  banType: ban.banType,
                  expiresAt: ban.expiresAt,
                };
              }
              break;
            }
            case 'hidden': {
              const hidden = await prisma.hiddenContent.findUnique({
                where: { id: appeal.targetId },
              });
              if (hidden) {
                targetInfo = {
                  type: 'hidden',
                  targetType: hidden.targetType,
                  targetId: hidden.targetId,
                  reason: hidden.reason,
                };
              }
              break;
            }
            case 'penalty': {
              const penalty = await prisma.userPenalty.findUnique({
                where: { id: appeal.targetId },
                include: {
                  user: { select: { username: true } },
                },
              });
              if (penalty) {
                targetInfo = {
                  type: 'penalty',
                  user: penalty.user?.username,
                  penaltyType: penalty.penaltyType,
                  reason: penalty.reason,
                  value: penalty.value,
                };
              }
              break;
            }
          }
        } catch {
          // 忽略关联查询错误
        }

        return {
          id: appeal.id,
          userId: appeal.userId,
          user: appeal.user,
          appealType: appeal.appealType,
          targetId: appeal.targetId,
          targetInfo,
          content: appeal.content,
          status: appeal.status,
          reviewerId: appeal.reviewerId,
          reviewer: appeal.reviewer,
          reviewNote: appeal.reviewNote,
          reviewedAt: appeal.reviewedAt,
          createdAt: appeal.createdAt,
        };
      })
    );

    const response: Record<string, unknown> = {};

    // 如果需要历史统计，添加历史记录
    if (includeHistory && userId) {
      const historyStats = {
        totalAppeals: userAppealHistory.length,
        approvedAppeals: userAppealHistory.filter(a => a.status === 'approved').length,
        rejectedAppeals: userAppealHistory.filter(a => a.status === 'rejected').length,
        pendingAppeals: userAppealHistory.filter(a => a.status === 'pending').length,
        byType: {
          ban: userAppealHistory.filter(a => a.appealType === 'ban').length,
          hidden: userAppealHistory.filter(a => a.appealType === 'hidden').length,
          penalty: userAppealHistory.filter(a => a.appealType === 'penalty').length,
        },
        recentHistory: userAppealHistory.slice(0, 10),
      };
      response.historyStats = historyStats;
    }

    return paginated(formattedAppeals, buildPaginationMeta(total, page, limit));
  } catch (err) {
    return handlePrismaError(err);
  }
}
