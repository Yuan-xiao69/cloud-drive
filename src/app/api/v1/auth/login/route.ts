/**
 * API v1 - 登录
 * POST /api/v1/auth/login
 *
 * 使用 defineRoute 框架 + SessionService 统一会话管理
 * 修复：Token 仅通过 HttpOnly Cookie 传递，不再返回在 JSON body 中
 * 新增：MFA 二次验证检查
 */
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { defineRoute } from '@/lib/framework/define-route';
import { SessionService } from '@/services/session-service';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { success, errors, ErrorCodes, getRequestId } from '@/lib/api/v1';
import { getClientIP, signMfaToken } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';

// ---- Zod 验证 Schema ----

const loginSchema = z.object({
  account: z.string().min(1, '账号不能为空'),
  password: z.string().min(1, '密码不能为空'),
});

type LoginBody = z.infer<typeof loginSchema>;

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
  validation: loginSchema,
  handler: async ({ req, body }) => {
    const requestId = getRequestId(req) || crypto.randomUUID();
    const { account, password } = body as LoginBody;

    // 账号维度限流：叠加在 IP 维度之上，防止分布式单账号爆破
    const accountLimit = await checkRateLimit(req, 'auth', account.trim().toLowerCase());
    if (!accountLimit.allowed) {
      return errors.rateLimited();
    }

    logger.info('auth/login', `登录尝试`, { account }, requestId);

    // 查找用户（支持用户名、邮箱或 UID 登录）
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: account },
          { email: account.toLowerCase() },
          { uid: account },
        ],
      },
    });

    if (!user) {
      logger.warn('auth/login', `用户不存在: ${account}`, undefined, requestId);
      return errors.invalidCredentials(requestId);
    }

    logger.info('auth/login', `找到用户: ${user.username} (${user.role})`, undefined, requestId);

    // 检查是否被封禁
    if (user.isBanned) {
      logger.warn('auth/login', `被封禁用户尝试登录: ${user.username}`, undefined, requestId);
      return errors.userBanned(requestId);
    }

    // 验证密码
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      logger.warn('auth/login', `密码不匹配: ${user.username}`, undefined, requestId);
      // 记录失败登录历史（fire-and-forget）
      prisma.loginHistory.create({
        data: {
          userId: user.id,
          ipAddress: getClientIP(req),
          userAgent: req.headers.get('user-agent') ?? undefined,
          success: false,
        },
      }).catch(err => console.error('记录登录历史失败:', err));
      return errors.invalidCredentials(requestId);
    }

    logger.info('auth/login', `登录成功: ${user.username}`, undefined, requestId);

    // MFA 二次验证检查
    if (user.mfaEnabled) {
      const mfaToken = signMfaToken(user.id);
      // 返回 MFA_REQUIRED 状态，需要前端引导用户输入 TOTP 验证码
      return new Response(
        JSON.stringify({
          code: ErrorCodes.MFA_REQUIRED,
          message: '需要MFA验证',
          data: { mfaToken },
          errors: null,
          meta: {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            requestId,
          },
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'X-API-Version': '1.0.0',
            'X-Request-Id': requestId,
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
          },
        }
      );
    }

    // 无 MFA：通过 SessionService 创建会话，签发双 Token
    const tokens = await SessionService.create({
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
      avatarUrl: user.avatarUrl,
      uid: user.uid,
      tokenVersion: user.tokenVersion,
    });

    // 记录成功登录历史（fire-and-forget）
    prisma.loginHistory.create({
      data: {
        userId: user.id,
        ipAddress: getClientIP(req),
        userAgent: req.headers.get('user-agent') ?? undefined,
        success: true,
      },
    }).catch(err => console.error('记录登录历史失败:', err));

    // 构建响应：Token 仅通过 HttpOnly Cookie 传递，不返回在 JSON body 中
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

    const response = success({ user: userResponse }, '登录成功');

    // 设置 HttpOnly Cookie（前端无法通过 JS 读取，防止 XSS 窃取 Token）
    response.cookies.set('access_token', tokens.accessToken, getCookieOptions(60 * 15)); // 15 分钟
    response.cookies.set('refresh_token', tokens.refreshToken, getCookieOptions(60 * 60 * 24 * 7)); // 7 天

    return response;
  },
});
