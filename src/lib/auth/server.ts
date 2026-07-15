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
 *
 * @deprecated 新代码推荐使用 SessionService.validate() 替代，
 *             提供更完整的会话管理（isBanned / tokenVersion 检查、会话 TTL 等）。
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

    // 从数据库获取完整用户信息（含封禁状态和 Token 版本号）
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, username: true, role: true, email: true, avatarUrl: true, isBanned: true, tokenVersion: true },
    });

    if (!user) return null;

    // 被封禁的用户拒绝其请求
    if (user.isBanned) return null;

    // Token 版本号校验：改密码/被封禁后旧 Token 立即失效
    if (user.tokenVersion !== payload.tokenVersion) return null;

    return { id: user.id, username: user.username, role: user.role, email: user.email, avatar: user.avatarUrl };
  } catch {
    return null;
  }
}
