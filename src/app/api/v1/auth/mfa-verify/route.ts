export const dynamic = 'force-dynamic';
/**
 * API v1 - MFA 验证
 * POST /api/v1/auth/mfa-verify
 *
 * 登录第二阶段：验证 TOTP 码后签发正式 Token
 * 接受登录阶段返回的 mfaToken + 用户输入的 TOTP 验证码
 */
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { verify as verifyTotp } from 'otplib';
import { defineRoute } from '@/lib/framework/define-route';
import { SessionService } from '@/services/session-service';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { success, errors, ErrorCodes, getRequestId } from '@/lib/api/v1';
import { getClientIP } from '@/lib/auth';

// ---- TOTP 配置 ----
const totpOptions = { window: 1 };

// ---- Zod Schema ----
const mfaVerifySchema = z.object({
  mfaToken: z.string().min(1, 'MFA Token 不能为空'),
  totpCode: z.string().length(6, '验证码为 6 位数字').regex(/^\d{6}$/, '验证码格式不正确'),
});

type MfaVerifyBody = z.infer<typeof mfaVerifySchema>;

// ---- Cookie 配置 ----
function getCookieOptions(maxAge: number) {
  // 内网 HTTP 部署时 secure 必须为 false，否则浏览器会丢弃 cookie 导致登录失效；
  // HTTPS 部署时在 .env 设置 COOKIE_SECURE=true 即可
  const secure = process.env.COOKIE_SECURE === 'true';
  return {
    httpOnly: true,
    secure,
    sameSite: 'strict' as const,
    path: '/',
    maxAge,
  };
}

// ---- 路由定义 ----
export const POST = defineRoute({
  auth: 'none',
  rateLimit: 'auth',
  validation: mfaVerifySchema,
  handler: async ({ req, body }) => {
    const requestId = getRequestId(req) || crypto.randomUUID();
    const { mfaToken, totpCode } = body as MfaVerifyBody;

    // 1. 验证 mfaToken
    const secret = process.env.JWT_SECRET || 'dev_secret_please_change_in_production';
    let mfaPayload: { userId: string; purpose: string } | null = null;
    try {
      mfaPayload = jwt.verify(mfaToken, secret) as { userId: string; purpose: string };
    } catch {
      return errors.badRequest('MFA Token 无效或已过期（5分钟有效期）', requestId);
    }

    if (mfaPayload.purpose !== 'mfa-verify') {
      return errors.badRequest('无效的 MFA Token 类型', requestId);
    }

    // 2. 获取用户完整信息
    const user = await prisma.user.findUnique({
      where: { id: mfaPayload.userId },
    });

    if (!user) {
      return errors.userNotFound(undefined, requestId);
    }

    if (user.isBanned) {
      return errors.userBanned(requestId);
    }

    if (!user.mfaEnabled || !user.mfaSecret) {
      return errors.badRequest('该用户未启用 MFA', requestId);
    }

    // 3. 验证 TOTP 码
    const totpValid = await verifyTotp({ token: totpCode, secret: user.mfaSecret });

    if (!totpValid) {
      logger.warn('auth/mfa-verify', `TOTP 验证失败: ${user.username}`, undefined, requestId);
      return errors.badRequest('验证码错误，请重试', requestId);
    }

    logger.info('auth/mfa-verify', `MFA 验证成功: ${user.username}`, undefined, requestId);

    // 4. 签发正式 Token（通过 SessionService）
    const tokens = await SessionService.create({
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
      avatarUrl: user.avatarUrl,
      uid: user.uid,
      tokenVersion: user.tokenVersion,
    });

    // 记录登录历史
    prisma.loginHistory.create({
      data: {
        userId: user.id,
        ipAddress: getClientIP(req),
        userAgent: req.headers.get('user-agent') ?? undefined,
        success: true,
      },
    }).catch(err => console.error('记录登录历史失败:', err));

    // 5. 构建响应 — Token 仅通过 HttpOnly Cookie 传递
    const userResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl ?? undefined,
      bio: user.bio ?? undefined,
      role: user.role,
      location: user.location ?? undefined,
      website: user.website ?? undefined,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };

    const response = success({ user: userResponse }, 'MFA 验证成功，已登录');

    response.cookies.set('access_token', tokens.accessToken, getCookieOptions(60 * 15));
    response.cookies.set('refresh_token', tokens.refreshToken, getCookieOptions(60 * 60 * 24 * 7));

    return response;
  },
});
