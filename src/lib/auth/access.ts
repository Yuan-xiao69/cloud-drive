/**
 * 统一的仓库权限检查
 *
 * 所有仓库相关路由调用此函数，不再各自手写 if 判断。
 *
 * 规则（按优先级）：
 *   1. 公开仓库 + 读操作 → 放行（无需登录）
 *   2. 其余操作 + 未登录 → 401
 *   3. 管理员 → 全部放行
 *   4. 所有者 → 全部放行
 *   5. 其余 → 403
 */

import { NextRequest } from 'next/server';
import { getAuthUser } from './index';
import { prisma } from '@/lib/prisma';
import { errors, ErrorCodes, error } from '@/lib/api/v1';

export interface AccessResult {
  allowed: true;
  userId: string;
  username: string;
  role: string;
  repo: { id: string; ownerId: string; visibility: number };
}

export interface AccessDenied {
  allowed: false;
  error: Response;
}

type Action = 'read' | 'write';

/**
 * 检查当前用户对指定仓库是否有操作权限
 */
export async function checkRepoAccess(
  req: NextRequest,
  repoIdOrParams: string | { username: string; repoName: string },
  action: Action
): Promise<AccessResult | AccessDenied> {
  // 解析仓库
  let repo: { id: string; ownerId: string; visibility: number } | null;
  if (typeof repoIdOrParams === 'string') {
    repo = await prisma.repository.findUnique({
      where: { id: repoIdOrParams, deletedAt: null },
      select: { id: true, ownerId: true, visibility: true },
    });
  } else {
    repo = await prisma.repository.findFirst({
      where: {
        owner: { username: repoIdOrParams.username },
        name: repoIdOrParams.repoName,
        deletedAt: null,
      },
      select: { id: true, ownerId: true, visibility: true },
    });
  }

  if (!repo) {
    return { allowed: false, error: error(ErrorCodes.NOT_FOUND, { message: '仓库不存在' }) };
  }

  // 公开仓库 + 读操作 → 所有人可访问
  if (repo.visibility === 1 && action === 'read') {
    const user = await getAuthUser(req);
    return {
      allowed: true,
      userId: user?.userId || '',
      username: user?.username || '',
      role: user?.role || '',
      repo,
    };
  }

  // 其余所有情况 → 必须登录
  const user = await getAuthUser(req);
  if (!user) {
    return { allowed: false, error: errors.unauthorized(action === 'write' ? '请先登录' : '私有仓库需要登录') };
  }

  // 管理员 → 全部放行
  if (user.role === 'admin' || user.role === 'super_admin') {
    return { allowed: true, ...user, repo };
  }

  // 所有者 → 全部放行
  if (user.userId === repo.ownerId) {
    return { allowed: true, ...user, repo };
  }

  // 拒绝
  return { allowed: false, error: errors.forbidden(action === 'write' ? '只有仓库所有者可以修改' : '无权访问该私有仓库') };
}
