export const dynamic = 'force-dynamic';
import { defineRoute } from '@/lib/framework/define-route';
import { success, errors } from '@/lib/api/v1';
import { SessionService } from '@/services/session-service';

// POST /api/v1/auth/refresh
export const POST = defineRoute({
  auth: 'none',
  async handler({ req }) {
    // 优先从 Cookie 获取 refreshToken，其次从请求体（兼容旧版前端）
    let refreshToken: string | null = null;

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

    if (!refreshToken) {
      const body = await req.json().catch(() => ({})) as { refreshToken?: string };
      refreshToken = body.refreshToken || null;
    }

    if (!refreshToken) {
      return errors.badRequest('refreshToken 不能为空');
    }

    // 使用 SessionService 进行 Token 刷新（含 Token 家族追踪与重用检测）
    const tokens = await SessionService.refresh(refreshToken);
    if (!tokens) {
      return errors.tokenExpired();
    }

    // 仅设置 HttpOnly Cookie，不在 JSON body 中返回 Token
    const response = success(null, 'Token 刷新成功');
    const secure = process.env.COOKIE_SECURE === 'true';
    response.cookies.set('access_token', tokens.accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 15,
    });
    response.cookies.set('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  },
});
