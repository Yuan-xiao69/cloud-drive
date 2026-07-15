/**
 * 申诉管理服务 (AppealService)
 *
 * 封装申诉创建、查询、审批的业务逻辑，
 * 供管理后台路由调用。
 *
 * 核心功能：
 *   1. create()  — 创建申诉
 *   2. list()    — 获取申诉列表（分页 + 过滤 + 历史统计）
 *   3. approve() — 通过申诉（撤销相关处罚）
 *   4. reject()  — 拒绝申诉
 *   5. getById() — 获取申诉详情
 *   6. delete()  — 删除申诉记录
 */

import { prisma } from '@/lib/prisma';
import { BusinessError } from '@/lib/framework';

// ============================================================
// 类型定义
// ============================================================

/** 合法的申诉类型 */
const VALID_APPEAL_TYPES = ['ban', 'hidden', 'penalty'] as const;

/** 合法的申诉状态 */
const VALID_APPEAL_STATUSES = ['pending', 'approved', 'rejected'] as const;

export interface CreateAppealInput {
  userId: string;
  appealType: string;
  targetId: string;
  content: string;
}

export interface ListAppealsInput {
  type?: string;
  status?: string;
  page?: number;
  size?: number;
  userId?: string;
  includeHistory?: boolean;
}

export interface AppealListItem {
  id: string;
  userId: string;
  user: {
    id: string;
    username: string;
    email: string;
    avatarUrl: string | null;
    role: string;
  } | null;
  appealType: string;
  targetId: string;
  targetInfo: Record<string, unknown> | null;
  content: string;
  status: string;
  reviewerId: string | null;
  reviewer: {
    id: string;
    username: string;
  } | null;
  reviewNote: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
}

export interface PaginatedAppeals {
  items: AppealListItem[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
  historyStats?: {
    totalAppeals: number;
    approvedAppeals: number;
    rejectedAppeals: number;
    pendingAppeals: number;
    byType: { ban: number; hidden: number; penalty: number };
    recentHistory: Array<{
      appealType: string;
      status: string;
      createdAt: Date;
      reviewedAt: Date | null;
      reviewer: { username: string } | null;
    }>;
  };
}

export interface AppealDetail {
  id: string;
  userId: string;
  user: {
    id: string;
    username: string;
    email: string;
    avatarUrl: string | null;
    role: string;
  } | null;
  appealType: string;
  targetId: string;
  targetInfo: Record<string, unknown> | null;
  content: string;
  status: string;
  reviewerId: string | null;
  reviewer: {
    id: string;
    username: string;
  } | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApproveResult {
  id: string;
  status: string;
  reviewerId: string;
  reviewNote: string | null;
  reviewedAt: string;
}

// ============================================================
// AppealService
// ============================================================

export class AppealService {
  // ==========================================================
  // create — 创建申诉
  // ==========================================================

  /**
   * 创建一个新的申诉。
   *
   * 验证：
   *   1. 用户存在且未被封禁
   *   2. appealType 在白名单内
   *   3. 申诉内容非空
   *   4. 同一用户对同一目标不能有 pending 申诉
   *
   * @throws {BusinessError} 验证失败时抛出
   */
  static async create(input: CreateAppealInput) {
    const { userId, appealType, targetId, content } = input;

    // 校验用户
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isBanned: true },
    });
    if (!user) {
      throw new BusinessError('notFound', '用户');
    }
    if (user.isBanned) {
      throw new BusinessError('forbidden', '您的账号已被封禁，无法提交申诉');
    }

    // 校验申诉类型
    if (
      !VALID_APPEAL_TYPES.includes(appealType as typeof VALID_APPEAL_TYPES[number])
    ) {
      throw new BusinessError('INVALID_PARAMS', '无效的申诉类型');
    }

    // 校验内容
    if (!content?.trim()) {
      throw new BusinessError('INVALID_PARAMS', '申诉内容不能为空');
    }

    // 检查重复申诉
    const existing = await prisma.appeal.findFirst({
      where: {
        userId,
        appealType,
        targetId,
        status: 'pending',
      },
    });
    if (existing) {
      throw new BusinessError('badRequest', '您已提交过该申诉，请等待管理员审核');
    }

    const appeal = await prisma.appeal.create({
      data: {
        userId,
        appealType,
        targetId,
        content: content.trim(),
        status: 'pending',
      },
      include: {
        user: {
          select: { id: true, username: true, email: true, avatarUrl: true, role: true },
        },
      },
    });

    return {
      id: appeal.id,
      userId: appeal.userId,
      user: appeal.user,
      appealType: appeal.appealType,
      targetId: appeal.targetId,
      content: appeal.content,
      status: appeal.status,
      createdAt: appeal.createdAt.toISOString(),
    };
  }

  // ==========================================================
  // list — 获取申诉列表
  // ==========================================================

  /**
   * 分页查询申诉列表，支持按类型、状态、用户过滤。
   *
   * @param input.includeHistory - 是否包含该用户的历史申诉统计
   */
  static async list(input: ListAppealsInput = {}): Promise<PaginatedAppeals> {
    const {
      type: appealType,
      status,
      page = 1,
      size = 20,
      userId,
      includeHistory = false,
    } = input;

    const where: Record<string, unknown> = {};
    if (appealType) where.appealType = appealType;
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const [appeals, total] = await Promise.all([
      prisma.appeal.findMany({
        where,
        include: {
          user: {
            select: { id: true, username: true, email: true, avatarUrl: true, role: true },
          },
          reviewer: {
            select: { id: true, username: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
      prisma.appeal.count({ where }),
    ]);

    // 格式化列表项，获取关联的详细信息
    const formattedAppeals: AppealListItem[] = await Promise.all(
      appeals.map(async (appeal) => {
        let targetInfo: Record<string, unknown> | null = null;

        try {
          targetInfo = await AppealService.getTargetInfo(
            appeal.appealType,
            appeal.targetId,
          );
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
      }),
    );

    const result: PaginatedAppeals = {
      items: formattedAppeals,
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };

    // 历史统计
    if (includeHistory && userId) {
      const historyAppeals = await prisma.appeal.findMany({
        where: { userId },
        select: {
          appealType: true,
          status: true,
          createdAt: true,
          reviewedAt: true,
          reviewer: { select: { username: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      result.historyStats = {
        totalAppeals: historyAppeals.length,
        approvedAppeals: historyAppeals.filter((a) => a.status === 'approved').length,
        rejectedAppeals: historyAppeals.filter((a) => a.status === 'rejected').length,
        pendingAppeals: historyAppeals.filter((a) => a.status === 'pending').length,
        byType: {
          ban: historyAppeals.filter((a) => a.appealType === 'ban').length,
          hidden: historyAppeals.filter((a) => a.appealType === 'hidden').length,
          penalty: historyAppeals.filter((a) => a.appealType === 'penalty').length,
        },
        recentHistory: historyAppeals.slice(0, 10),
      };
    }

    return result;
  }

  // ==========================================================
  // approve — 通过申诉
  // ==========================================================

  /**
   * 通过申诉，撤销相关处罚。
   *
   * 操作流程：
   *   1. 查找申诉，确认状态为 pending
   *   2. 根据 appealType 撤销对应处罚
   *   3. 更新申诉状态为 approved
   *
   * @throws {BusinessError} 申诉不存在或已被处理时抛出
   */
  static async approve(
    appealId: string,
    adminId: string,
    reviewNote?: string,
  ): Promise<ApproveResult> {
    const appeal = await prisma.appeal.findUnique({ where: { id: appealId } });
    if (!appeal) {
      throw new BusinessError('notFound', '申诉');
    }
    if (appeal.status !== 'pending') {
      throw new BusinessError('badRequest', '该申诉已被处理，无法重复操作');
    }

    // 撤销相关处罚
    try {
      await AppealService.revokePenalty(appeal.appealType, appeal.targetId);
    } catch {
      // 忽略撤销处罚的错误，继续完成申诉审批
    }

    const now = new Date();
    const updated = await prisma.appeal.update({
      where: { id: appealId },
      data: {
        status: 'approved',
        reviewerId: adminId,
        reviewNote: reviewNote || null,
        reviewedAt: now,
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      reviewerId: updated.reviewerId!,
      reviewNote: updated.reviewNote,
      reviewedAt: updated.reviewedAt!.toISOString(),
    };
  }

  // ==========================================================
  // reject — 拒绝申诉
  // ==========================================================

  /**
   * 拒绝申诉，处罚保持不变。
   *
   * @throws {BusinessError} 申诉不存在或已被处理时抛出
   */
  static async reject(
    appealId: string,
    adminId: string,
    reviewNote?: string,
  ): Promise<ApproveResult> {
    const appeal = await prisma.appeal.findUnique({ where: { id: appealId } });
    if (!appeal) {
      throw new BusinessError('notFound', '申诉');
    }
    if (appeal.status !== 'pending') {
      throw new BusinessError('badRequest', '该申诉已被处理，无法重复操作');
    }

    const now = new Date();
    const updated = await prisma.appeal.update({
      where: { id: appealId },
      data: {
        status: 'rejected',
        reviewerId: adminId,
        reviewNote: reviewNote || null,
        reviewedAt: now,
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      reviewerId: updated.reviewerId!,
      reviewNote: updated.reviewNote,
      reviewedAt: updated.reviewedAt!.toISOString(),
    };
  }

  // ==========================================================
  // getById — 获取申诉详情
  // ==========================================================

  /**
   * 获取单条申诉的完整详情，包含关联的处罚信息。
   */
  static async getById(appealId: string): Promise<AppealDetail> {
    const appeal = await prisma.appeal.findUnique({
      where: { id: appealId },
      include: {
        user: {
          select: { id: true, username: true, email: true, avatarUrl: true, role: true },
        },
        reviewer: {
          select: { id: true, username: true },
        },
      },
    });

    if (!appeal) {
      throw new BusinessError('notFound', '申诉');
    }

    let targetInfo: Record<string, unknown> | null = null;
    try {
      targetInfo = await AppealService.getTargetInfo(appeal.appealType, appeal.targetId);
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
      reviewedAt: appeal.reviewedAt?.toISOString() ?? null,
      createdAt: appeal.createdAt.toISOString(),
      updatedAt: appeal.updatedAt.toISOString(),
    };
  }

  // ==========================================================
  // delete — 删除申诉
  // ==========================================================

  /**
   * 删除申诉记录（硬删除）。
   *
   * @throws {BusinessError} 申诉不存在时抛出
   */
  static async delete(appealId: string): Promise<{ id: string }> {
    const appeal = await prisma.appeal.findUnique({ where: { id: appealId } });
    if (!appeal) {
      throw new BusinessError('notFound', '申诉');
    }

    await prisma.appeal.delete({ where: { id: appealId } });

    return { id: appealId };
  }

  // ==========================================================
  // 私有辅助方法
  // ==========================================================

  /**
   * 根据申诉类型撤销对应的处罚。
   */
  private static async revokePenalty(
    appealType: string,
    targetId: string,
  ): Promise<void> {
    switch (appealType) {
      case 'ban': {
        const ban = await prisma.userBan.update({
          where: { id: targetId },
          data: { isActive: false },
        });
        await prisma.user.update({
          where: { id: ban.userId },
          data: { isBanned: false },
        });
        break;
      }
      case 'hidden': {
        const hidden = await prisma.hiddenContent.findUnique({
          where: { id: targetId },
        });
        if (hidden) {
          switch (hidden.targetType) {
            case 'discussion':
              await prisma.discussion.update({
                where: { id: hidden.targetId },
                data: { isDeleted: false },
              });
              break;
            case 'issue':
              await prisma.issue.update({
                where: { id: hidden.targetId },
                data: { isDeleted: false },
              });
              break;
            case 'pullrequest':
              await prisma.pullRequest.update({
                where: { id: hidden.targetId },
                data: { isDeleted: false },
              });
              break;
            case 'repository':
              await prisma.repository.update({
                where: { id: hidden.targetId },
                data: { deletedAt: null },
              });
              break;
          }
          await prisma.hiddenContent.delete({ where: { id: targetId } });
        }
        break;
      }
      case 'penalty':
        await prisma.userPenalty.update({
          where: { id: targetId },
          data: { isActive: false },
        });
        break;
      default:
        break;
    }
  }

  /**
   * 获取申诉关联的目标详情。
   */
  private static async getTargetInfo(
    appealType: string,
    targetId: string,
  ): Promise<Record<string, unknown>> {
    switch (appealType) {
      case 'ban': {
        const ban = await prisma.userBan.findUnique({
          where: { id: targetId },
          include: { user: { select: { username: true } } },
        });
        if (!ban) return {};
        return {
          type: 'ban',
          user: ban.user?.username,
          reason: ban.reason,
          banType: ban.banType,
          expiresAt: ban.expiresAt,
        };
      }
      case 'hidden': {
        const hidden = await prisma.hiddenContent.findUnique({
          where: { id: targetId },
        });
        if (!hidden) return {};
        return {
          type: 'hidden',
          targetType: hidden.targetType,
          targetId: hidden.targetId,
          reason: hidden.reason,
        };
      }
      case 'penalty': {
        const penalty = await prisma.userPenalty.findUnique({
          where: { id: targetId },
          include: { user: { select: { username: true } } },
        });
        if (!penalty) return {};
        return {
          type: 'penalty',
          user: penalty.user?.username,
          penaltyType: penalty.penaltyType,
          reason: penalty.reason,
          value: penalty.value,
        };
      }
      default:
        return {};
    }
  }
}
