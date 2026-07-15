/**
 * 仓库协作权限检查
 *
 * 统一管理基于 RepoCollaborator 的协作者角色权限判断。
 * 所有仓库相关操作应调用此模块的函数，不再各自手写 if 判断。
 */

import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { errors } from '@/lib/api/v1';

export type RepoRole = 'admin' | 'write' | 'triage' | 'read';

/**
 * 获取用户对指定仓库的角色
 * @returns 'owner' | RepoRole | null
 */
export async function getUserRepoRole(
  userId: string,
  repoId: string
): Promise<RepoRole | 'owner' | null> {
  // 1. 检查是否是所有者
  const repo = await prisma.repository.findUnique({
    where: { id: repoId },
    select: { ownerId: true },
  });
  if (repo?.ownerId === userId) return 'owner';

  // 2. 检查是否是协作者
  const collab = await prisma.repoCollaborator.findUnique({
    where: { repoId_userId: { repoId, userId } },
    select: { role: true },
  });
  return (collab?.role as RepoRole) || null;
}

/**
 * 是否有写入权限（修改文件、上传等）
 */
export function canWrite(role: RepoRole | 'owner' | null): boolean {
  return role === 'owner' || role === 'admin' || role === 'write';
}

/**
 * 是否可以管理 Issues（创建、编辑、关闭、标记等）
 */
export function canManageIssues(role: RepoRole | 'owner' | null): boolean {
  return role === 'owner' || role === 'admin' || role === 'write' || role === 'triage';
}

/**
 * 是否可以管理仓库设置（修改名称、描述、可见性、协作者、删除等）
 */
export function canManageRepo(role: RepoRole | 'owner' | null): boolean {
  return role === 'owner' || role === 'admin';
}

/**
 * 是否有读取权限（私有仓库检查）
 */
export function canRead(role: RepoRole | 'owner' | null): boolean {
  return role !== null;
}

/**
 * 一站式权限守卫：获取用户+仓库角色，失败时返回错误响应
 * 用法: const guard = await repoGuard(req, repoId); if (!guard.ok) return guard.error;
 */
export async function repoGuard(
  req: NextRequest,
  repoId: string
): Promise<
  | { ok: true; userId: string; role: RepoRole | 'owner'; repo: { id: string; ownerId: string; visibility: number; name: string } }
  | { ok: false; error: Response }
> {
  const auth = await getAuthUser(req);
  if (!auth) return { ok: false, error: errors.unauthorized() };

  const role = await getUserRepoRole(auth.userId, repoId);
  if (!role) {
    // 检查是否公开仓库（未登录/非协作者对公开仓库可读）
    const repo = await prisma.repository.findUnique({ where: { id: repoId }, select: { id: true, ownerId: true, visibility: true, name: true } });
    if (repo && repo.visibility === 1) {
      return { ok: true, userId: auth.userId, role: 'read', repo };
    }
    return { ok: false, error: errors.forbidden('无权访问此仓库') };
  }

  const repo = await prisma.repository.findUnique({ where: { id: repoId }, select: { id: true, ownerId: true, visibility: true, name: true } });
  if (!repo) return { ok: false, error: errors.forbidden('仓库不存在') };

  return { ok: true, userId: auth.userId, role, repo };
}
