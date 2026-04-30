export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { success, errors, handlePrismaError, getRequestId } from '@/lib/api/v1';
import { verifyRefreshToken, signAccessToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RefreshRequest {
  refreshToken?: string;
}

interface RefreshResponse {
  accessToken: string;
}

// POST /api/v1/auth/refresh
export async function POST(req: NextRequest) {
  const requestId = getRequestId(req);

  try {
    // 优先从请求体获取 refreshToken（兼容旧版前端）
    // 新版前端不再发送 refreshToken，改为从 Cookie 获取
    let refreshToken: string | null = null;

    const body = await req.json().catch(() => ({})) as RefreshRequest;
    if (body.refreshToken) {
      refreshToken = body.refreshToken;
    } else {
      // 从 Cookie 获取
      const cookieHeader = req.headers.get('cookie');
      if (cookieHeader) {
        const cookies = Object.fromEntries(
          cookieHeader.split(';').map((c) => {
            const [key, ...rest] = c.trim().split('=');
            return [key, rest.join('=')];
          })
        );
        refreshToken = cookies['refresh_token'] || null;
      }
    }

    if (!refreshToken) {
      return errors.badRequest('refreshToken 不能为空', requestId);
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return errors.tokenExpired(requestId);
    }

    // 检查用户是否仍然存在且未被封禁
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return errors.userNotFound(undefined, requestId);
    }

    if (user.isBanned) {
      return errors.userBanned(requestId);
    }

    // 签发新的 access token
    const accessToken = signAccessToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    // 同步更新 cookie（access_token 非 HttpOnly，前端需要读取）
    const response = success<RefreshResponse>({ accessToken }, 'Token 刷新成功', 200, requestId);
    const isProd = process.env.NODE_ENV === 'production';
    response.cookies.set('access_token', accessToken, {
      httpOnly: false, // 前端需要读取
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 15,
    });

    return response;
  } catch (error) {
    console.error('[v1/auth/refresh] Error:', error);
    return handlePrismaError(error, requestId);
  }
}
