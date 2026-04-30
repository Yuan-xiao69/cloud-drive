/**
 * CSRF 防护中间件
 * 用于 API 路由的 CSRF 保护
 * 使用 Redis 存储 CSRF Token，支持多实例部署
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getRedisClient } from './redis-queue';

// CSRF 白名单：不需要 CSRF 验证的路径
const CSRF_WHITELIST = [
  '/api/health',
  '/api/docs',
  '/api/notifications/stream',
  '/api/share',
  '/api/repos/', // GET 请求不需要 CSRF
];

// 检查路径是否在白名单中
function isWhitelisted(path: string, method: string): boolean {
  // GET、HEAD、OPTIONS 请求不需要 CSRF 验证
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return true;
  }

  // 检查白名单
  for (const pattern of CSRF_WHITELIST) {
    if (path.startsWith(pattern)) {
      return true;
    }
  }

  return false;
}

// 获取请求来源
function getOrigin(req: NextRequest): string | null {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');

  return origin || (referer ? new URL(referer).origin : null);
}

// 验证请求来源
function validateOrigin(req: NextRequest): boolean {
  const origin = getOrigin(req);
  if (!origin) {
    // 没有 Origin/Referer 头，可能是 CSRF 攻击
    return false;
  }

  // 验证 origin 与请求的 host 匹配
  const host = req.headers.get('host');
  if (!host) {
    return false;
  }

  // 允许本地开发环境
  const allowedHosts = [
    host,
    `localhost:${process.env.PORT || 3000}`,
    '127.0.0.1',
    'localhost',
  ];

  // 检查 origin 是否来自可信来源
  try {
    const originUrl = new URL(origin);
    return allowedHosts.some(
      (h) => originUrl.host === h || originUrl.host.endsWith(`.${h}`)
    );
  } catch {
    return false;
  }
}

// CSRF Token 存储（使用 Redis 或内存）
// 注意：生产环境应使用 Redis 存储
const csrfTokenStore = new Map<string, { token: string; expiresAt: number }>();

/**
 * 生成 CSRF Token
 * 使用 Redis 存储，支持多实例部署和持久化
 */
export async function generateCsrfToken(sessionId: string): Promise<string> {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // 使用 Redis 存储，2小时过期
  const key = `csrf:${sessionId}`;
  const ttl = 2 * 60 * 60; // 2 小时（秒）

  try {
    const client = await getRedisClient();
    await client.setex(key, ttl, token);
  } catch (error) {
    // Redis 不可用时，记录警告但仍然返回 token（降级处理）
    console.warn('CSRF: Redis 不可用，使用内存存储', error);
    csrfTokenStore.set(sessionId, {
      token,
      expiresAt: Date.now() + 2 * 60 * 60 * 1000,
    });
  }

  return token;
}

/**
 * 验证 CSRF Token
 * 先尝试 Redis，不可用时降级到内存
 */
export async function validateCsrfToken(sessionId: string, token: string): Promise<boolean> {
  // 优先使用 Redis 验证
  try {
    const client = await getRedisClient();
    const key = `csrf:${sessionId}`;
    const stored = await client.get(key);

    if (stored === null) {
      return false;
    }

    // 时序安全比较，防止时序攻击
    const tokenBuffer = Buffer.from(token, 'utf-8');
    const storedBuffer = Buffer.from(stored, 'utf-8');

    if (tokenBuffer.length !== storedBuffer.length) {
      return false;
    }

    const crypto = require('crypto');
    const timingMatch = crypto.timingSafeEqual(tokenBuffer, storedBuffer);

    if (timingMatch) {
      // 验证成功后删除 token（一次性使用）
      await client.del(key);
      return true;
    }

    return false;
  } catch (error) {
    // Redis 不可用，降级到内存
    console.warn('CSRF: Redis 验证失败，降级到内存', error);

    const stored = csrfTokenStore.get(sessionId);
    if (!stored) {
      return false;
    }

    if (Date.now() > stored.expiresAt) {
      csrfTokenStore.delete(sessionId);
      return false;
    }

    if (stored.token !== token) {
      return false;
    }

    csrfTokenStore.delete(sessionId);
    return true;
  }
}

/**
 * CSRF 验证中间件
 */
export async function csrfProtect(req: NextRequest): Promise<{
  valid: boolean;
  error?: NextResponse;
}> {
  const pathname = req.nextUrl.pathname;
  const method = req.method;

  // 检查是否在白名单中
  if (isWhitelisted(pathname, method)) {
    return { valid: true };
  }

  // 获取 session
  const user = await getAuthUser(req);

  if (!user) {
    // 未登录用户不需要 CSRF 验证（但会被后续的认证中间件拦截）
    return { valid: true };
  }

  // 验证 Origin
  if (!validateOrigin(req)) {
    console.warn('CSRF: Invalid origin', {
      origin: req.headers.get('origin'),
      referer: req.headers.get('referer'),
      path: pathname,
    });

    return {
      valid: false,
      error: NextResponse.json(
        { success: false, message: '无效的请求来源' },
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      ),
    };
  }

  // 验证 CSRF Token（从请求头获取）
  const csrfToken = req.headers.get('x-csrf-token');
  if (csrfToken) {
    const sessionId = user.userId;
    if (!await validateCsrfToken(sessionId as string, csrfToken)) {
      console.warn('CSRF: Invalid token', {
        path: pathname,
      });

      return {
        valid: false,
        error: NextResponse.json(
          { success: false, message: 'CSRF 验证失败' },
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        ),
      };
    }
  }

  return { valid: true };
}

/**
 * 敏感操作验证
 * 某些操作需要额外的确认验证
 */
export interface SensitiveOperationConfig {
  action: string;
  requirePassword?: boolean;
  requireConfirm?: boolean;
  auditLog?: boolean;
}

/**
 * 敏感操作配置
 */
export const SENSITIVE_OPERATIONS: Record<string, SensitiveOperationConfig> = {
  deleteAccount: {
    action: '删除账号',
    requirePassword: true,
    requireConfirm: true,
    auditLog: true,
  },
  transferOwnership: {
    action: '转移仓库所有权',
    requirePassword: true,
    requireConfirm: true,
    auditLog: true,
  },
  deleteRepository: {
    action: '删除仓库',
    requirePassword: false,
    requireConfirm: true,
    auditLog: true,
  },
  changeEmail: {
    action: '修改邮箱',
    requirePassword: true,
    requireConfirm: false,
    auditLog: true,
  },
  changePassword: {
    action: '修改密码',
    requirePassword: true,
    requireConfirm: false,
    auditLog: true,
  },
  banUser: {
    action: '封禁用户',
    requirePassword: false,
    requireConfirm: true,
    auditLog: true,
  },
  unbanUser: {
    action: '解封用户',
    requirePassword: false,
    requireConfirm: true,
    auditLog: true,
  },
};

/**
 * 验证敏感操作
 */
export async function validateSensitiveOperation(
  req: NextRequest,
  operation: string,
  data: { password?: string; confirmText?: string }
): Promise<{ valid: boolean; error?: string }> {
  const config = SENSITIVE_OPERATIONS[operation];

  if (!config) {
    return { valid: true }; // 未配置的操作默认放行
  }

  // 需要密码验证
  if (config.requirePassword) {
    if (!data.password) {
      return { valid: false, error: '需要验证密码' };
    }

    // 从请求中获取当前用户
    const user = await getAuthUser(req);
    if (!user) {
      return { valid: false, error: '用户未登录，无法验证密码' };
    }

    // 查询用户密码哈希
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { passwordHash: true },
    });

    if (!dbUser) {
      return { valid: false, error: '用户不存在' };
    }

    // 使用 bcrypt 比对密码
    const passwordMatch = await bcrypt.compare(data.password, dbUser.passwordHash);
    if (!passwordMatch) {
      return { valid: false, error: '密码错误' };
    }
  }

  // 需要确认
  if (config.requireConfirm) {
    if (!data.confirmText) {
      return { valid: false, error: '需要确认操作' };
    }

    // 确认文本应该是操作相关的关键词
    const confirmKeywords: Record<string, string[]> = {
      deleteAccount: ['删除账号', '确认删除'],
      deleteRepository: ['删除仓库', '确认删除'],
      transferOwnership: ['确认转移', '转移所有权'],
    };

    const keywords = confirmKeywords[operation] || ['确认', '删除'];
    const isConfirmed = keywords.some(
      (k) => data.confirmText?.includes(k)
    );

    if (!isConfirmed) {
      return { valid: false, error: '确认文本不正确' };
    }
  }

  return { valid: true };
}
