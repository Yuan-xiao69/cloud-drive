/**
 * 用户操作服务 (UserService)
 *
 * 封装用户间社交操作（关注/拉黑）及个人设置（资料更新/密码修改）的核心业务逻辑。
 * 所有方法均为静态方法，不依赖实例状态，适合在 API Route 中直接调用。
 *
 * 核心功能：
 *   1. follow / unfollow   — 关注/取消关注用户
 *   2. block / unblock     — 拉黑/取消拉黑用户（拉黑时自动解除互相关注）
 *   3. updateProfile       — 更新个人资料（用户名、简介、位置、网站、头像）
 *   4. changePassword      — 修改密码（验证旧密码 + 强度校验 + 使所有会话失效）
 */

import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { SessionService } from '@/services/session-service';
import { BusinessError } from '@/lib/framework';

// ============================================================
// 类型定义
// ============================================================

/** 更新资料时可传入的字段 */
export interface UpdateProfileData {
  username?: string;
  bio?: string;
  location?: string;
  website?: string;
  avatarUrl?: string;
}

/** 资料更新结果 */
export interface ProfileResult {
  id: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  updatedAt: string;
}

/** 密码修改结果 */
export interface PasswordResult {
  username: string;
}

// ============================================================
// 内部工具
// ============================================================

/**
 * 根据用户名查找目标用户，不存在时抛出 BusinessError。
 */
async function resolveTargetUser(username: string) {
  const target = await prisma.user.findFirst({
    where: { username, isSystem: false },
    select: { id: true, username: true },
  });

  if (!target) {
    throw new BusinessError('userNotFound', username);
  }

  return target;
}

// ============================================================
// UserService
// ============================================================

export class UserService {
  // ==========================================================
  // follow — 关注用户
  // ==========================================================

  /**
   * 关注指定用户。
   *
   * 前置检查：
   *   - 目标用户存在
   *   - 不能关注自己
   *   - 双方不存在屏蔽关系
   *   - 未重复关注
   *
   * @param userId         - 当前用户 ID
   * @param targetUsername - 要关注的用户名
   * @returns { following: true }
   */
  static async follow(userId: string, targetUsername: string) {
    const target = await resolveTargetUser(targetUsername);

    if (target.id === userId) {
      throw new BusinessError('forbidden', '不能关注自己');
    }

    // 检查屏蔽关系
    const isBlocked = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: target.id },
          { blockerId: target.id, blockedId: userId },
        ],
      },
      select: { id: true },
    });

    if (isBlocked) {
      throw new BusinessError('forbidden', '由于屏蔽关系，无法关注该用户');
    }

    // 检查是否已关注
    const existing = await prisma.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: target.id,
        },
      },
    });

    if (existing) {
      throw new BusinessError('badRequest', '已关注该用户');
    }

    await prisma.userFollow.create({
      data: { followerId: userId, followingId: target.id },
    });

    return { following: true };
  }

  // ==========================================================
  // unfollow — 取消关注
  // ==========================================================

  /**
   * 取消关注指定用户。
   *
   * @param userId         - 当前用户 ID
   * @param targetUsername - 要取消关注的用户名
   * @returns { following: false }
   */
  static async unfollow(userId: string, targetUsername: string) {
    const target = await resolveTargetUser(targetUsername);

    if (target.id === userId) {
      throw new BusinessError('forbidden', '不能对自己执行此操作');
    }

    const existing = await prisma.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: target.id,
        },
      },
    });

    if (!existing) {
      throw new BusinessError('badRequest', '未关注该用户');
    }

    await prisma.userFollow.delete({ where: { id: existing.id } });

    return { following: false };
  }

  // ==========================================================
  // block — 拉黑用户
  // ==========================================================

  /**
   * 拉黑指定用户。
   *
   * 拉黑时自动解除双方关注关系。
   *
   * @param userId         - 当前用户 ID
   * @param targetUsername - 要拉黑的用户名
   * @returns { blocked: true }
   */
  static async block(userId: string, targetUsername: string) {
    const target = await resolveTargetUser(targetUsername);

    if (target.id === userId) {
      throw new BusinessError('forbidden', '不能拉黑自己');
    }

    const existing = await prisma.userBlock.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: userId,
          blockedId: target.id,
        },
      },
      select: { id: true },
    });

    if (existing) {
      throw new BusinessError('badRequest', '已拉黑该用户');
    }

    await prisma.userBlock.create({
      data: {
        blockerId: userId,
        blockedId: target.id,
      },
    });

    // 同时移除关注关系
    await prisma.userFollow.deleteMany({
      where: {
        OR: [
          { followerId: userId, followingId: target.id },
          { followerId: target.id, followingId: userId },
        ],
      },
    });

    return { blocked: true };
  }

  // ==========================================================
  // unblock — 取消拉黑
  // ==========================================================

  /**
   * 取消拉黑指定用户。
   *
   * @param userId         - 当前用户 ID
   * @param targetUsername - 要取消拉黑的用户名
   * @returns { blocked: false }
   */
  static async unblock(userId: string, targetUsername: string) {
    const target = await resolveTargetUser(targetUsername);

    const existing = await prisma.userBlock.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: userId,
          blockedId: target.id,
        },
      },
      select: { id: true },
    });

    if (!existing) {
      throw new BusinessError('badRequest', '未拉黑该用户');
    }

    await prisma.userBlock.delete({ where: { id: existing.id } });

    return { blocked: false };
  }

  // ==========================================================
  // updateProfile — 更新个人资料
  // ==========================================================

  /**
   * 更新当前用户的个人资料。
   *
   * 仅允许用户修改自己的资料。修改用户名时会检查唯一性。
   *
   * @param userId - 当前用户 ID
   * @param data   - 要更新的字段（未传入的字段保持不变）
   * @returns 更新后的用户资料
   */
  static async updateProfile(
    userId: string,
    data: UpdateProfileData,
  ): Promise<ProfileResult> {
    // 1. 查找当前用户
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    });

    if (!dbUser) {
      throw new BusinessError('notFound', '用户');
    }

    const { username: newUsername, bio, location, website, avatarUrl } = data;

    // 2. 修改用户名时检查唯一性
    if (newUsername !== undefined && newUsername !== dbUser.username) {
      const existing = await prisma.user.findFirst({
        where: { username: newUsername, id: { not: dbUser.id } },
      });

      if (existing) {
        throw new BusinessError('badRequest', '该用户名已被使用');
      }
    }

    // 3. 更新用户
    const updated = await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        ...(newUsername !== undefined &&
          newUsername !== dbUser.username && { username: newUsername }),
        ...(bio !== undefined && { bio }),
        ...(location !== undefined && { location }),
        ...(website !== undefined && { website }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        bio: true,
        location: true,
        website: true,
        updatedAt: true,
      },
    });

    return {
      id: updated.id,
      username: updated.username,
      avatarUrl: updated.avatarUrl,
      bio: updated.bio,
      location: updated.location,
      website: updated.website,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  // ==========================================================
  // changePassword — 修改密码
  // ==========================================================

  /**
   * 修改当前用户的登录密码。
   *
   * 操作流程：
   *   1. 验证旧密码正确
   *   2. 验证新密码强度（至少8位，包含字母和数字）
   *   3. 生成新密码哈希（bcrypt, 12 轮）
   *   4. 更新密码 + 递增 tokenVersion（使所有旧会话失效）
   *   5. 通过 SessionService.invalidateAll 清理 Redis 中的 Token 家族
   *
   * @param userId      - 当前用户 ID
   * @param oldPassword - 当前密码
   * @param newPassword - 新密码
   * @returns { username }
   */
  static async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<PasswordResult> {
    // 1. 密码强度验证
    if (newPassword.length < 8) {
      throw new BusinessError('badRequest', '新密码至少8位');
    }

    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      throw new BusinessError('badRequest', '新密码必须包含字母和数字');
    }

    // 2. 查找用户
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, passwordHash: true },
    });

    if (!dbUser) {
      throw new BusinessError('notFound', '用户');
    }

    // 3. 验证旧密码
    if (dbUser.passwordHash) {
      const passwordMatch = await bcrypt.compare(oldPassword, dbUser.passwordHash);
      if (!passwordMatch) {
        throw new BusinessError('forbidden', '当前密码错误');
      }
    }

    // 4. 生成新密码哈希
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // 5. 更新密码 + 使所有旧 Token 失效（数据库层面）
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { passwordHash: newPasswordHash, tokenVersion: { increment: 1 } },
    });

    // 6. 清理 Redis 中的 Token 家族记录
    await SessionService.invalidateAll(userId);

    return { username: dbUser.username };
  }
}
