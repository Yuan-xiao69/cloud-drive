export const dynamic = 'force-dynamic';
import { defineRoute } from '@/lib/framework/define-route';
import { success } from '@/lib/api/v1';
import { invalidateAllTokens } from '@/lib/auth';

// POST /api/v1/auth/logout
export const POST = defineRoute({
  auth: 'optional',
  async handler({ user }) {
    const secure = process.env.COOKIE_SECURE === 'true';

    // 如果用户已认证，使所有 Token 失效（最佳努力，不阻断登出流程）
    if (user) {
      try {
        await invalidateAllTokens(user.id);
      } catch {
        // Token 失效失败不阻止登出
      }
    }

    const response = success(null, '已退出登录');

    // 清除 access_token cookie（HttpOnly，服务端清除）
    response.cookies.set('access_token', '', {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 0, // 立即过期
    });

    // 清除 refresh_token cookie
    response.cookies.set('refresh_token', '', {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: 0, // 立即过期
    });

    return response;
  },
});
