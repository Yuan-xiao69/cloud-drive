export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { success } from '@/lib/api/v1';

// POST /api/v1/auth/logout
export async function POST(req: NextRequest) {
  // 清除 HttpOnly Cookie（无状态 JWT，服务器不需要维护黑名单）
  const isProd = process.env.NODE_ENV === 'production';

  const response = success(null, '已退出登录');

  // 清除 access_token cookie（前端需要读取，所以不能用 HttpOnly）
  response.cookies.set('access_token', '', {
    httpOnly: false,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // 立即过期
  });

  // 清除 refresh_token cookie
  response.cookies.set('refresh_token', '', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // 立即过期
  });

  return response;
}
