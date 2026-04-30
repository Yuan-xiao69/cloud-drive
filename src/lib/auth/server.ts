// Server-only 认证函数（仅限 Server Component / API Route 使用）
// 这些函数使用了 next/headers，不能被 Client Component 导入

import { headers } from 'next/headers';
import { verifyAccessToken } from './index';
import { prisma } from '@/lib/prisma';

export interface SessionUser {
  id: string;
  username: string;
  role: string;
  email?: string;
  avatar?: string | null;
}

/**
 * 在 Server Component / Server Action 中调用，获取当前登录用户。
 * 返回 null 表示未登录，返回用户对象表示已登录。
 */
export async function auth(): Promise<SessionUser | null> {
  try {
    const headersList = await headers();
    const cookieHeader = headersList.get('cookie');
    if (!cookieHeader) return null;

    // 从 cookie 中提取 access_token
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map((c) => {
        const [key, ...rest] = c.trim().split('=');
        return [key, rest.join('=')];
      })
    );

    const token = cookies['access_token'];
    if (!token) return null;

    const payload = verifyAccessToken(token);
    if (!payload) return null;

    // 从数据库获取完整用户信息
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, username: true, role: true, email: true, avatarUrl: true },
    });

    return user ? { ...user, avatar: user.avatarUrl } : null;
  } catch {
    return null;
  }
}
