/**
 * 统一会话管理服务 (SessionService)
 *
 * 替代两套独立的认证路径，将所有 Token/会话操作集中到单一入口：
 *   - src/lib/auth/index.ts 中的 getAuthUser / requireAuth / requireAdmin / invalidateAllTokens
 *   - src/lib/auth/server.ts 中的 auth()
 *
 * 设计理念来自 GitHub 的做法：所有会话生命周期管理（创建、刷新、验证、失效）
 * 都在一个服务类中完成，避免多套逻辑分散导致的不一致。
 *
 * 核心功能：
 *   1. create()  - 登录/注册后创建会话，签发双 Token
 *   2. refresh() - 刷新 Token，含 Token 重用检测（防重放攻击）
 *   3. validate() - 单一认证入口，同时支持 API Route 和 Server Component
 *   4. invalidateAll() - 使某用户的所有会话立即失效
 */

import { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { createHash, randomUUID } from 'crypto';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  extractBearerToken,
  extractCookieToken,
  type JWTPayload,
} from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getRedisClient, type RedisClientInterface } from '@/lib/redis-client';

// ============================================================
// 类型定义
// ============================================================

/** 已验证的会话用户信息（贯穿整个请求生命周期） */
export interface SessionUser {
  id: string;
  username: string;
  role: string;
  email?: string | null;
  avatarUrl?: string | null;
  uid: string | null;
  /** 当前是否被封禁（始终为 false，封禁用户在 validate 阶段即返回 null） */
  isBanned: boolean;
  /** 当前 Token 版本号，用于缓存键/乐观锁 */
  tokenVersion: number;
}

/** 签发的 Token 对 */
export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

/** 创建会话时需要的用户数据 */
export interface UserData {
  id: string;
  username: string;
  role: string;
  email?: string | null;
  avatarUrl?: string | null;
  uid: string | null;
  tokenVersion: number;
}

/** 刷新 Token 的 JWT 载荷（扩展基础载荷，增加 familyId 和 jti） */
interface RefreshTokenPayload extends JWTPayload {
  /** Token 家族 ID — 同一登录会话签发和刷新出的所有 Token 共享此 ID */
  familyId: string;
  /** JWT ID — 唯一标识这一枚具体的 Refresh Token */
  jti: string;
}

/** Redis 中单个 Token 家族的数据结构 */
interface TokenFamilyEntry {
  /** 已使用的 Refresh Token 哈希列表（防重用检测） */
  tokens: string[];
  /** 家族创建时间（Unix 毫秒） */
  createdAt: number;
}

/** Redis 中某用户全部 Token 家族的数据结构 */
interface UserTokenFamilies {
  families: Record<string, TokenFamilyEntry>;
}

// ============================================================
// 常量
// ============================================================

/** Redis Key 前缀 */
const REDIS_FAMILY_KEY_PREFIX = 'rt_family:';

/** Token 家族在 Redis 中的 TTL（秒）= 8 天（Refresh Token 7 天 + 1 天缓冲） */
const FAMILY_TTL_SECONDS = 8 * 24 * 60 * 60;

/** 日志前缀 */
const LOG_PREFIX = '[SessionService]';

// ============================================================
// 工具函数
// ============================================================

/**
 * 对 Refresh Token 做 SHA-256 哈希，用于安全存储在 Redis 中
 * 即使 Redis 被入侵，也无法从哈希反推原始 Token
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * 获取 Redis 客户端，不可用时返回 null（调用方做降级处理）
 */
async function getRedis(): Promise<RedisClientInterface | null> {
  try {
    return await getRedisClient();
  } catch {
    console.warn(`${LOG_PREFIX} Redis 不可用，Token 家族追踪将跳过`);
    return null;
  }
}

/**
 * 构建 Redis Key
 */
function familyKey(userId: string): string {
  return `${REDIS_FAMILY_KEY_PREFIX}${userId}`;
}

/**
 * 从 NextRequest 中提取 Access Token
 * 优先 Cookie，其次 Authorization Header
 */
function extractToken(req: NextRequest): string | null {
  const cookieToken = extractCookieToken(req);
  if (cookieToken) return cookieToken;
  return extractBearerToken(req);
}

/**
 * 从 headers() 中提取 Access Token（Server Component 路径）
 */
async function extractTokenFromHeaders(): Promise<string | null> {
  try {
    const headersList = await headers();
    const cookieHeader = headersList.get('cookie');
    if (!cookieHeader) return null;

    const cookies = Object.fromEntries(
      cookieHeader.split(';').map((c) => {
        const [key, ...rest] = c.trim().split('=');
        return [key, rest.join('=')];
      }),
    );

    return cookies['access_token'] || null;
  } catch {
    return null;
  }
}

// ============================================================
// SessionService
// ============================================================

export class SessionService {
  // ==========================================================
  // create — 创建新会话
  // ==========================================================

  /**
   * 创建新会话（登录/注册成功后调用）。
   *
   * 1. 生成 Token 家族 ID（UUID），用于后续刷新时追踪同一会话链
   * 2. 签发 Access Token（15分钟）+ Refresh Token（7天）
   * 3. 在 Redis 中记录 Token 家族（Refresh Token 的哈希存入家族）
   * 4. 返回 Token 对，由调用方设置为 HttpOnly Cookie
   *
   * @param user - 登录用户的核心数据
   * @returns 签发的 Token 对
   */
  static async create(user: UserData): Promise<Tokens> {
    const familyId = randomUUID();
    const jti = randomUUID();

    // 签发 Access Token（短期，不含 familyId/jti）
    const accessToken = signAccessToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });

    // 签发 Refresh Token（长期，含 familyId + jti 用于家族追踪）
    const refreshToken = signRefreshToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      tokenVersion: user.tokenVersion,
      familyId,
      jti,
    } as JWTPayload);

    // 在 Redis 中记录 Token 家族
    const redis = await getRedis();
    if (redis) {
      try {
        const key = familyKey(user.id);
        const raw = await redis.get(key);
        const data: UserTokenFamilies = raw
          ? (JSON.parse(raw) as UserTokenFamilies)
          : { families: {} };

        // 将当前 Refresh Token 的哈希作为"已签发"记录存入家族
        // 刷新时如果相同的哈希再次出现，即为重用攻击
        data.families[familyId] = {
          tokens: [hashToken(refreshToken)],
          createdAt: Date.now(),
        };

        await redis.set(key, JSON.stringify(data));
        await redis.expire(key, FAMILY_TTL_SECONDS);
      } catch (err) {
        // Redis 写入失败不阻断登录流程，仅记录警告
        console.warn(
          `${LOG_PREFIX} 创建 Token 家族失败（Redis 写入异常），Token 重用检测将不可用:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    return { accessToken, refreshToken };
  }

  // ==========================================================
  // refresh — 刷新 Token（含重用检测）
  // ==========================================================

  /**
   * 使用 Refresh Token 换取新的 Token 对。
   *
   * 实现 Token Rotation + 重用检测：
   *   - 每次刷新签发全新的 Access Token + Refresh Token
   *   - 旧的 Refresh Token 哈希被标记为"已使用"
   *   - 如果同一个 Refresh Token 被使用两次（重用攻击），
   *     立即使整个 Token 家族失效（全部会话作废）
   *
   * @param oldRefreshToken - 客户端提交的旧 Refresh Token
   * @returns 新的 Token 对，或 null（Token 无效/已过期/重用攻击）
   */
  static async refresh(oldRefreshToken: string): Promise<Tokens | null> {
    // 1. 验证 Refresh Token JWT
    const payload = verifyRefreshToken(oldRefreshToken) as RefreshTokenPayload | null;
    if (!payload || !payload.familyId || !payload.jti) {
      console.warn(`${LOG_PREFIX} Refresh Token JWT 无效或缺少 familyId/jti`);
      return null;
    }

    const { userId, familyId } = payload;
    const oldTokenHash = hashToken(oldRefreshToken);

    // 2. 从数据库获取最新用户状态
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        role: true,
        email: true,
        avatarUrl: true,
        uid: true,
        isBanned: true,
        tokenVersion: true,
        deletedAt: true,
      },
    });

    // 用户不存在/已删除/被封禁 → 拒绝刷新
    if (!user || user.deletedAt || user.isBanned) {
      console.warn(
        `${LOG_PREFIX} 刷新拒绝：用户 ${userId} 不存在/已删除/被封禁`,
      );
      return null;
    }

    // Token 版本号不匹配（用户已改密码/全局登出）→ 拒绝刷新
    if (user.tokenVersion !== payload.tokenVersion) {
      console.warn(
        `${LOG_PREFIX} 刷新拒绝：Token 版本号不匹配 (JWT=${payload.tokenVersion}, DB=${user.tokenVersion})`,
      );
      return null;
    }

    // 3. Redis 中检查 Token 家族（重用检测）
    const redis = await getRedis();
    if (redis) {
      try {
        const key = familyKey(userId);
        const raw = await redis.get(key);
        const data: UserTokenFamilies = raw
          ? (JSON.parse(raw) as UserTokenFamilies)
          : { families: {} };

        const family = data.families[familyId];

        if (family) {
          // 检查当前 Token 哈希是否已在"已使用"列表中
          if (family.tokens.includes(oldTokenHash)) {
            // ⚠️ Token 重用检测触发！
            // 同一个 Refresh Token 被使用了两次 — 这是典型的重放攻击信号
            console.error(
              `${LOG_PREFIX} [安全] 检测到 Refresh Token 重用！userId=${userId}, familyId=${familyId}`,
            );

            // 立即使该用户的所有 Token 家族失效
            await SessionService.invalidateAll(userId);

            return null;
          }

          // Token 未被重用 → 将旧 Token 哈希加入已使用列表
          family.tokens.push(oldTokenHash);
          await redis.set(key, JSON.stringify(data));
          await redis.expire(key, FAMILY_TTL_SECONDS);
        } else {
          // 家族不存在（可能已过期被清理）→ 允许刷新，重新建立家族
          console.warn(
            `${LOG_PREFIX} Token 家族 ${familyId} 不存在，可能已过期，重新建立`,
          );
          data.families[familyId] = {
            tokens: [oldTokenHash],
            createdAt: Date.now(),
          };
          await redis.set(key, JSON.stringify(data));
          await redis.expire(key, FAMILY_TTL_SECONDS);
        }
      } catch (err) {
        // Redis 操作失败 → 降级：允许刷新但无重用检测保护
        console.warn(
          `${LOG_PREFIX} Redis 操作异常，Token 重用检测跳过:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    // 4. 签发全新 Token 对
    const newFamilyId = familyId; // 保持同一家族
    const newJti = randomUUID();

    const accessToken = signAccessToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });

    const refreshToken = signRefreshToken({
      userId: user.id,
      username: user.username,
      role: user.role,
      tokenVersion: user.tokenVersion,
      familyId: newFamilyId,
      jti: newJti,
    } as JWTPayload);

    // 将新签发的 Refresh Token 哈希也加入家族（标记为"已签发"）
    if (redis) {
      try {
        const key = familyKey(userId);
        const raw = await redis.get(key);
        if (raw) {
          const data = JSON.parse(raw) as UserTokenFamilies;
          if (data.families[newFamilyId]) {
            data.families[newFamilyId].tokens.push(hashToken(refreshToken));
            await redis.set(key, JSON.stringify(data));
            await redis.expire(key, FAMILY_TTL_SECONDS);
          }
        }
      } catch {
        // 非关键操作，静默失败
      }
    }

    return { accessToken, refreshToken };
  }

  // ==========================================================
  // validate — 统一请求验证（单一认证入口）
  // ==========================================================

  /**
   * 验证当前请求的登录状态。
   *
   * 同时支持两种调用方式：
   *   - API Route:       `SessionService.validate(req)`  — 传入 NextRequest
   *   - Server Component: `SessionService.validate()`     — 从 headers() 自动提取
   *
   * 验证链（任一失败即返回 null）：
   *   1. 提取 Token（Cookie > Authorization Header）
   *   2. 验证 JWT 签名与过期
   *   3. 查询数据库确认用户存在
   *   4. 检查用户未被软删除（deletedAt）
   *   5. 检查用户未被封禁（isBanned）
   *   6. 检查 Token 版本号匹配（改密码/全局登出后旧 Token 失效）
   *
   * 相比旧 server.ts 的 auth()，此方法新增了 isBanned、tokenVersion、
   * 和 deletedAt 检查，修复了封禁用户仍可通过验证的 bug。
   *
   * @param req - NextRequest（可选，Server Component 中不传）
   * @returns SessionUser 或 null
   */
  static async validate(req?: NextRequest): Promise<SessionUser | null> {
    try {
      // 1. 提取 Token
      let token: string | null = null;
      if (req) {
        // API Route 路径：从 NextRequest 提取
        token = extractToken(req);
      } else {
        // Server Component 路径：从 headers() 提取
        token = await extractTokenFromHeaders();
      }

      if (!token) return null;

      // 2. 验证 JWT
      const payload = verifyAccessToken(token);
      if (!payload) return null;

      // 3. 查询数据库获取完整用户状态
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          username: true,
          role: true,
          email: true,
          avatarUrl: true,
          uid: true,
          isBanned: true,
          tokenVersion: true,
          deletedAt: true,
        },
      });

      // 4. 用户不存在
      if (!user) return null;

      // 5. 用户已被软删除
      if (user.deletedAt) return null;

      // 6. 用户已被封禁
      if (user.isBanned) return null;

      // 7. Token 版本号校验：改密码/被封禁/全局登出后旧 Token 立即失效
      if (user.tokenVersion !== payload.tokenVersion) return null;

      // 全部验证通过
      return {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
        avatarUrl: user.avatarUrl,
        uid: user.uid,
        isBanned: user.isBanned,
        tokenVersion: user.tokenVersion,
      };
    } catch (err) {
      console.error(
        `${LOG_PREFIX} validate 异常:`,
        err instanceof Error ? err.message : err,
      );
      return null;
    }
  }

  // ==========================================================
  // invalidateAll — 使所有会话失效
  // ==========================================================

  /**
   * 立即使指定用户的所有会话全部失效。
   *
   * 两步操作（强一致性）：
   *   1. 递增数据库中的 tokenVersion → 所有已签发的 JWT 立即失效
   *   2. 删除 Redis 中该用户的所有 Token 家族 → 阻止 Refresh Token 被继续使用
   *
   * 调用场景：
   *   - 用户修改密码
   *   - 用户被封禁
   *   - 管理员强制下线
   *   - 用户主动"登出所有设备"
   *   - 检测到 Refresh Token 重用攻击
   *
   * @param userId - 目标用户 ID
   */
  static async invalidateAll(userId: string): Promise<void> {
    // 1. 递增 tokenVersion（数据库层面使所有 JWT 失效）
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { tokenVersion: { increment: 1 } },
      });
    } catch (err) {
      console.error(
        `${LOG_PREFIX} tokenVersion 递增失败 (userId=${userId}):`,
        err instanceof Error ? err.message : err,
      );
      throw err;
    }

    // 2. 删除 Redis 中的 Token 家族记录
    const redis = await getRedis();
    if (redis) {
      try {
        const key = familyKey(userId);
        await redis.del(key);
      } catch (err) {
        // Redis 删除失败不阻断主流程（tokenVersion 已递增，JWT 已失效）
        console.warn(
          `${LOG_PREFIX} Redis Token 家族删除失败 (userId=${userId}):`,
          err instanceof Error ? err.message : err,
        );
      }
    }
  }
}
