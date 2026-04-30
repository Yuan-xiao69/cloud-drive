/**
 * 用户限制检查工具
 * 用于在关键操作前检查用户是否被处罚
 */

import { prisma } from './prisma';

export type PenaltyType = 'mute' | 'repo_limit' | 'storage_limit';

/**
 * 检查用户是否被禁言
 */
export async function isUserMuted(userId: string): Promise<{ muted: boolean; penalty?: { reason: string; endDate: Date | null } }> {
  const penalty = await prisma.userPenalty.findFirst({
    where: {
      userId,
      penaltyType: 'mute',
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ]
    },
    select: {
      reason: true,
      expiresAt: true,
    }
  });

  return {
    muted: !!penalty,
    penalty: penalty ? { reason: penalty.reason, endDate: penalty.expiresAt } : undefined
  };
}

/**
 * 检查用户是否被限制创建仓库
 */
export async function isUserRepoLimited(userId: string): Promise<{ limited: boolean; penalty?: { reason: string; endDate: Date | null } }> {
  const penalty = await prisma.userPenalty.findFirst({
    where: {
      userId,
      penaltyType: 'repo_limit',
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ]
    },
    select: {
      reason: true,
      expiresAt: true,
    }
  });

  return {
    limited: !!penalty,
    penalty: penalty ? { reason: penalty.reason, endDate: penalty.expiresAt } : undefined
  };
}

/**
 * 检查用户是否被限制存储
 */
export async function isUserStorageLimited(userId: string): Promise<{ limited: boolean; penalty?: { reason: string; endDate: Date | null } }> {
  const penalty = await prisma.userPenalty.findFirst({
    where: {
      userId,
      penaltyType: 'storage_limit',
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ]
    },
    select: {
      reason: true,
      expiresAt: true,
    }
  });

  return {
    limited: !!penalty,
    penalty: penalty ? { reason: penalty.reason, endDate: penalty.expiresAt } : undefined
  };
}

/**
 * 获取用户所有生效中的处罚
 */
export async function getActivePenalties(userId: string) {
  const penalties = await prisma.userPenalty.findMany({
    where: {
      userId,
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ]
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return penalties;
}

/**
 * 格式化处罚信息
 */
export function formatPenaltyInfo(penalty: { penaltyType: string; reason: string; endDate: Date | null }): string {
  const typeMap: Record<string, string> = {
    mute: '禁言',
    repo_limit: '仓库限制',
    storage_limit: '存储限制'
  };

  const typeName = typeMap[penalty.penaltyType] || penalty.penaltyType;
  const endStr = penalty.endDate 
    ? `，将于 ${penalty.endDate.toLocaleDateString('zh-CN')} 解除`
    : '，永久限制';

  return `您已被${typeName}：${penalty.reason}${endStr}`;
}
