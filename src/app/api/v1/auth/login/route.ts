export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import {
  success,
  errors,
  handlePrismaError,
  getRequestId,
  ErrorCodes,
  type PaginationMeta,
} from '@/lib/api/v1';
import {
  signAccessToken,
  signRefreshToken,
  getClientIP,
} from '@/lib/auth';

interface LoginRequest {
  account: string;
  password: string;
}

interface LoginResponse {
  user: {
    id: string;
    username: string;
    email: string;
    avatarUrl?: string;
    bio?: string;
    role: string;
    location?: string;
    website?: string;
    createdAt: string;
    updatedAt: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

// POST /api/v1/auth/login
export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);

  try {
    const body: LoginRequest = await req.json();
    const { account, password } = body;

    // 参数校验
    if (!account || !password) {
      return errors.badRequest('账号和密码不能为空', requestId);
    }

    // 查找用户（支持用户名或邮箱登录）
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: account },
          { email: account.toLowerCase() },
        ],
      },
    });

    if (!user) {
      return errors.invalidCredentials(requestId);
    }

    // 检查是否被封禁
    if (user.isBanned) {
      return errors.userBanned(requestId);
    }

    // 验证密码
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      // 记录失败登录历史
      await prisma.loginHistory.create({
        data: {
          userId: user.id,
          ipAddress: getClientIP(req),
          userAgent: req.headers.get('user-agent') ?? undefined,
          success: false,
        },
      });
      return errors.invalidCredentials(requestId);
    }

    // 生成 Token
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
    };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    // 记录成功登录历史
    await prisma.loginHistory.create({
      data: {
        userId: user.id,
        ipAddress: getClientIP(req),
        userAgent: req.headers.get('user-agent') ?? undefined,
        success: true,
      },
    });

    // 格式化用户响应
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

    // 创建响应对象
    const response = success<LoginResponse>(
      {
        user: userResponse,
        tokens: {
          accessToken,
          refreshToken,
        },
      },
      '登录成功'
    );

    // 设置 Cookie
    const isProd = process.env.NODE_ENV === 'production';

    response.cookies.set('access_token', accessToken, {
      httpOnly: true, // 安全：前端无法读取，防止 XSS 劫持
      secure: isProd,
      sameSite: 'strict', // 更严格的 CSRF 保护
      path: '/',
      maxAge: 60 * 15, // 15 分钟
    });
    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true, // 安全：前端无法读取
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 天
    });

    return response;
  } catch (error) {
    console.error('[v1/auth/login] Error:', error);
    return handlePrismaError(error, requestId);
  }
}
