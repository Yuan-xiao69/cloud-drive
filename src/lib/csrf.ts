/**
 * CSRF 防护中间件
 * 使用统一 Redis 客户端模块存储 CSRF Token
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getRedisClient } from '@/lib/redis-client';
import { isCsrfExempt, type SensitiveOperationConfig, SENSITIVE_OPERATIONS } from '@/lib/config/csrf';

function getOrigin(req: NextRequest): string | null {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  return origin || (referer ? new URL(referer).origin : null);
}

function validateOrigin(req: NextRequest): boolean {
  const origin = getOrigin(req);
  if (!origin) return false;
  const host = req.headers.get('host');
  if (!host) return false;
  const allowedHosts = [host, `localhost:${process.env.PORT || 3000}`, '127.0.0.1', 'localhost'];
  try {
    const originUrl = new URL(origin);
    return allowedHosts.some((h) => originUrl.host === h || originUrl.host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

// CSRF Token 内存降级存储
const csrfTokenStore = new Map<string, { token: string; expiresAt: number }>();

/** 生成 CSRF Token（Redis 优先，内存降级） */
export async function generateCsrfToken(sessionId: string): Promise<string> {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const key = `csrf:${sessionId}`;
  const ttl = 2 * 60 * 60;

  const client = await getRedisClient();
  if (client) {
    try {
      await client.setex(key, ttl, token);
    } catch (error) {
      console.warn('CSRF: Redis 写入失败，使用内存存储', error);
      csrfTokenStore.set(sessionId, { token, expiresAt: Date.now() + ttl * 1000 });
    }
  } else {
    console.warn('CSRF: Redis 不可用，使用内存存储');
    csrfTokenStore.set(sessionId, { token, expiresAt: Date.now() + ttl * 1000 });
  }

  return token;
}

/** 验证 CSRF Token（Redis 优先，内存降级） */
export async function validateCsrfToken(sessionId: string, token: string): Promise<boolean> {
  const client = await getRedisClient();
  if (client) {
    try {
      const key = `csrf:${sessionId}`;
      const stored = await client.get(key);
      if (stored === null) return false;
      const tokenBuffer = Buffer.from(token, 'utf-8');
      const storedBuffer = Buffer.from(stored, 'utf-8');
      if (tokenBuffer.length !== storedBuffer.length) return false;
      const { timingSafeEqual } = await import('node:crypto');
      return timingSafeEqual(tokenBuffer, storedBuffer);
    } catch (error) {
      console.warn('CSRF: Redis 验证失败，降级到内存', error);
    }
  }

  const stored = csrfTokenStore.get(sessionId);
  if (!stored) return false;
  if (Date.now() > stored.expiresAt) { csrfTokenStore.delete(sessionId); return false; }
  if (stored.token !== token) return false;
  return true;
}

/** CSRF 验证中间件 */
export async function csrfProtect(req: NextRequest): Promise<{
  valid: boolean;
  error?: NextResponse;
}> {
  const pathname = req.nextUrl.pathname;
  const method = req.method;

  // GET/HEAD/OPTIONS 是安全方法，无需 CSRF 保护
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return { valid: true };
  // 对状态变更方法，检查路径是否在 CSRF 豁免路径中
  if (isCsrfExempt(pathname)) return { valid: true };

  const user = await getAuthUser(req);
  if (!user) return { valid: true };

  if (!validateOrigin(req)) {
    console.warn('CSRF: Invalid origin', { origin: req.headers.get('origin'), path: pathname });
    return {
      valid: false,
      error: NextResponse.json({ success: false, message: '无效的请求来源' }, { status: 403, headers: { 'Content-Type': 'application/json' } }),
    };
  }

  const csrfToken = req.headers.get('x-csrf-token');
  if (!csrfToken) {
    return {
      valid: false,
      error: NextResponse.json({ success: false, message: '缺少 CSRF token' }, { status: 403, headers: { 'Content-Type': 'application/json' } }),
    };
  }

  const sessionId = user.userId;
  if (!await validateCsrfToken(sessionId as string, csrfToken)) {
    return {
      valid: false,
      error: NextResponse.json({ success: false, message: 'CSRF 验证失败' }, { status: 403, headers: { 'Content-Type': 'application/json' } }),
    };
  }

  return { valid: true };
}

export async function validateSensitiveOperation(
  req: NextRequest,
  operation: string,
  data: { password?: string; confirmText?: string }
): Promise<{ valid: boolean; error?: string }> {
  const config = SENSITIVE_OPERATIONS[operation];
  if (!config) return { valid: true };

  if (config.requirePassword) {
    if (!data.password) return { valid: false, error: '需要验证密码' };
    const user = await getAuthUser(req);
    if (!user) return { valid: false, error: '用户未登录，无法验证密码' };
    const dbUser = await prisma.user.findUnique({ where: { id: user.userId }, select: { passwordHash: true } });
    if (!dbUser) return { valid: false, error: '用户不存在' };
    const passwordMatch = await bcrypt.compare(data.password, dbUser.passwordHash);
    if (!passwordMatch) return { valid: false, error: '密码错误' };
  }

  if (config.requireConfirm) {
    if (!data.confirmText) return { valid: false, error: '需要确认操作' };
    const confirmKeywords: Record<string, string[]> = {
      deleteAccount: ['删除账号', '确认删除'],
      deleteRepository: ['删除仓库', '确认删除'],
      transferOwnership: ['确认转移', '转移所有权'],
    };
    const keywords = confirmKeywords[operation] || ['确认', '删除'];
    if (!keywords.some((k) => data.confirmText?.includes(k))) {
      return { valid: false, error: '确认文本不正确' };
    }
  }

  return { valid: true };
}
