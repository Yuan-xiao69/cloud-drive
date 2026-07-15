import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

// ---- V1 标准错误响应格式（与 @/lib/api/v1/response.ts 保持一致）----
const API_VERSION = '1.0.0';
const ERROR_CODES = {
  UNAUTHORIZED: 2000,
  FORBIDDEN: 3000,
} as const;

function buildV1ErrorResponse(code: number, message: string, httpStatus: number): Response {
  return new Response(
    JSON.stringify({
      code,
      message,
      errors: null,
      meta: {
        version: API_VERSION,
        timestamp: new Date().toISOString(),
        requestId: uuidv4(),
      },
    }),
    {
      status: httpStatus,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    }
  );
}

// JWT Secret - 生产环境必须从环境变量读取
const isProduction = process.env.NODE_ENV === 'production';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (isProduction) {
      throw new Error('FATAL: JWT_SECRET environment variable is required in production');
    }
    console.warn('[Auth] Using default JWT_SECRET in development mode. Set JWT_SECRET env var for production!');
    return 'dev_secret_please_change_in_production';
  }
  return secret;
}

function getRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    if (isProduction) {
      throw new Error('FATAL: JWT_REFRESH_SECRET environment variable is required in production');
    }
    console.warn('[Auth] Using default JWT_REFRESH_SECRET in development mode. Set JWT_REFRESH_SECRET env var for production!');
    return 'dev_refresh_secret_please_change';
  }
  return secret;
}

const JWT_SECRET = getJwtSecret();
const JWT_REFRESH_SECRET = getRefreshSecret();
const ACCESS_TOKEN_EXPIRES = '15m';
const REFRESH_TOKEN_EXPIRES = '7d';

export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

// ---- Token 生成 ----

export function signAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });
}

export function signRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES });
}

// ---- Token 验证 ----

export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// ---- 从 Request 中提取 Token ----

export function extractBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  return null;
}

/**
 * 从 Cookie 中提取 Token
 */
export function extractCookieToken(req: NextRequest): string | null {
  const cookieHeader = req.headers.get('cookie');
  if (!cookieHeader) return null;
  
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [key, ...rest] = c.trim().split('=');
      return [key, rest.join('=')];
    })
  );
  
  return cookies['access_token'] || null;
}

// ---- 认证中间件（返回 user 或 null）----

export async function getAuthUser(req: NextRequest): Promise<{
  userId: string;
  username: string;
  role: string;
} | null> {
  // 优先从 Authorization Header 获取（兼容旧版）
  let token = extractBearerToken(req);

  // 如果没有，尝试从 Cookie 获取（HttpOnly Cookie）
  if (!token) {
    token = extractCookieToken(req);
  }

  if (!token) return null;

  const payload = verifyAccessToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { isBanned: true, tokenVersion: true },
  });

  if (!user || user.isBanned) return null;

  // Token 版本号校验：改密码/被封禁后旧 Token 立即失效
  if (user.tokenVersion !== payload.tokenVersion) return null;

  return {
    userId: payload.userId,
    username: payload.username,
    role: payload.role,
  };
}

// ---- 强制登录中间件 ----

export async function requireAuth(req: NextRequest): Promise<{
  userId: string;
  username: string;
  role: string;
} | { error: Response }> {
  const user = await getAuthUser(req);
  if (!user) {
    return {
      error: buildV1ErrorResponse(
        ERROR_CODES.UNAUTHORIZED,
        '未登录或 Token 已过期',
        401
      ),
    };
  }
  return user;
}

// ---- Admin 类型定义 ----

export interface AdminAuthSuccess {
  userId: string;
  username: string;
  role: string;
}

export interface AdminAuthError {
  error: Response;
}

export type AdminAuthResult = AdminAuthSuccess | AdminAuthError;

/**
 * 类型守卫：判断 auth 结果是否为错误
 */
export function isAuthError(auth: AdminAuthResult): auth is AdminAuthError {
  return 'error' in auth;
}

// ---- 强制 Admin 权限 ----

export async function requireAdmin(req: NextRequest): Promise<AdminAuthResult> {
  const result = await requireAuth(req);
  if ('error' in result) return result;

  if (result.role !== 'admin' && result.role !== 'super_admin') {
    return {
      error: buildV1ErrorResponse(
        ERROR_CODES.FORBIDDEN,
        '无权限访问管理面板',
        403
      ),
    };
  }
  return result;
}

// ---- 记录审计日志 ----

export async function recordAuditLog(params: {
  adminId: string;
  userId?: string; // 被操作用户 ID（可选）
  actionType: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId: params.adminId,
        userId: params.userId,
        actionType: params.actionType,
        targetType: params.targetType,
        targetId: params.targetId,
        details: params.details ? JSON.parse(JSON.stringify(params.details)) as object : undefined,
        ipAddress: params.ipAddress,
      },
    });
  } catch (error) {
    console.error('Failed to record audit log:', error);
  }
}

/**
 * 递增用户 Token 版本号（使所有已签发 Token 失效）
 * 调用时机：修改密码、管理员封禁、登出所有设备
 */
export async function invalidateAllTokens(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  });
}

// ---- 获取客户端 IP ----

export function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    '0.0.0.0'
  );
}

// 注意：Server-only 认证函数已移至 server.ts
// 如需使用 auth() 函数，请在 Server Component 中从 '@/lib/auth/server' 导入
// 禁止在 Client Component 中导入 server.ts

