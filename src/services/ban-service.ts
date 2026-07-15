/**
 * 封禁管理服务 (BanService)
 *
 * 封装封禁/解封的核心业务逻辑，供管理后台路由调用。
 * 核心理念：封禁操作必须同时使目标用户的所有会话失效，
 * 确保被封禁用户立即无法继续访问系统。
 *
 * 核心功能：
 *   1. execute() — 执行封禁（创建封禁记录 + 标记 isBanned + 使所有 Token 失效）
 *   2. revoke()  — 解除封禁（标记封禁为无效 + 恢复 isBanned）
 */

import { prisma } from '@/lib/prisma';
import { SessionService } from '@/services/session-service';
import { recordAuditLog } from '@/lib/auth';
import { BusinessError } from '@/lib/framework';

// ============================================================
// 类型定义
// ============================================================

/** 封禁执行结果 */
export interface BanResult {
  id: string;
  userId: string;
  username: string;
  reason: string;
  banType: string;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

/** 解封执行结果 */
export interface RevokeResult {
  userId: string;
}

// ============================================================
// BanService
// ============================================================

export class BanService {
  // ==========================================================
  // execute — 执行封禁
  // ==========================================================

  /**
   * 对指定用户执行封禁操作。
   *
   * 操作流程：
   *   1. 校验目标用户存在且非系统账号
   *   2. 校验不能封禁自己
   *   3. 检查不存在活跃封禁（避免重复封禁）
   *   4. 在事务中创建封禁记录并标记 isBanned = true
   *   5. 立即使目标用户所有 Token 失效（SessionService.invalidateAll）
   *   6. 记录审计日志
   *
   * @param adminId   - 执行封禁的管理员 ID
   * @param userId    - 被封禁的用户 ID
   * @param reason    - 封禁原因
   * @param banType   - 封禁类型：'permanent'（永久）或 'temporary'（临时）
   * @param expiresAt - 临时封禁的过期时间（ISO 字符串），永久封禁可不传
   * @param ipAddress - 操作者 IP（可选，用于审计日志）
   * @returns 创建的封禁记录摘要
   */
  static async execute(
    adminId: string,
    userId: string,
    reason: string,
    banType: 'permanent' | 'temporary' = 'permanent',
    expiresAt?: string,
    ipAddress?: string,
  ): Promise<BanResult> {
    // 1. 校验目标用户
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, isSystem: true },
    });

    if (!targetUser) {
      throw new BusinessError('notFound', '用户');
    }

    if (targetUser.isSystem) {
      throw new BusinessError('forbidden', '无法封禁系统内置账号');
    }

    if (targetUser.id === adminId) {
      throw new BusinessError('forbidden', '无法封禁自己');
    }

    // 2. 检查是否存在活跃封禁
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
      throw new BusinessError('badRequest', '该用户已被封禁，请先解除现有封禁');
    }

    // 3. 在事务中创建封禁记录 + 标记用户
    const ban = await prisma.$transaction(async (tx) => {
      const created = await tx.userBan.create({
        data: {
          userId,
          bannerId: adminId,
          reason,
          banType,
          expiresAt: banType === 'temporary' ? new Date(expiresAt!) : null,
          isActive: true,
        },
        include: {
          user: {
            select: { id: true, username: true, email: true },
          },
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { isBanned: true },
      });

      return created;
    });

    // 4. 使目标用户所有会话立即失效
    await SessionService.invalidateAll(userId);

    // 5. 记录审计日志
    await recordAuditLog({
      adminId,
      actionType: 'create_ban',
      targetType: 'user',
      targetId: userId,
      details: { reason, banType, expiresAt },
      ipAddress,
    });

    return {
      id: ban.id,
      userId: ban.userId,
      username: ban.user.username,
      reason: ban.reason,
      banType: ban.banType,
      expiresAt: ban.expiresAt?.toISOString() ?? null,
      isActive: ban.isActive,
      createdAt: ban.createdAt.toISOString(),
    };
  }

  // ==========================================================
  // revoke — 解除封禁
  // ==========================================================

  /**
   * 解除指定封禁记录。
   *
   * 操作流程：
   *   1. 查找目标封禁记录（必须是活跃状态）
   *   2. 标记封禁为无效，记录解封原因和操作人
   *   3. 恢复用户 isBanned = false
   *   4. 记录审计日志
   *
   * 注意：解封时不会自动使 Token 失效（用户被解封后应能立即访问），
   * 但封禁期间 Token 已在 execute() 中失效。
   *
   * @param banId     - 封禁记录 ID
   * @param adminId   - 执行解封的管理员 ID
   * @param reason    - 解封原因
   * @param ipAddress - 操作者 IP（可选）
   * @returns 被解封的用户 ID
   */
  static async revoke(
    banId: string,
    adminId: string,
    reason: string,
    ipAddress?: string,
  ): Promise<RevokeResult> {
    // 1. 查找活跃封禁记录
    const existingBan = await prisma.userBan.findFirst({
      where: { id: banId, isActive: true },
    });

    if (!existingBan) {
      throw new BusinessError('notFound', '封禁记录');
    }

    // 2. 更新封禁记录为无效
    await prisma.userBan.update({
      where: { id: existingBan.id },
      data: {
        isActive: false,
        unbanReason: reason,
        unbannedAt: new Date(),
        unbannedBy: adminId,
      },
    });

    // 3. 恢复用户状态
    await prisma.user.update({
      where: { id: existingBan.userId },
      data: { isBanned: false },
    });

    // 4. 记录审计日志
    await recordAuditLog({
      adminId,
      actionType: 'remove_ban',
      targetType: 'user',
      targetId: existingBan.userId,
      details: { unbanReason: reason, previousBanId: existingBan.id },
      ipAddress,
    });

    return { userId: existingBan.userId };
  }
}
