export const dynamic = 'force-dynamic';
/**
 * v1 仓库详情 API
 * GET /api/v1/repos/[username]/[repoName] - 获取仓库详情
 * PATCH /api/v1/repos/[username]/[repoName] - 更新仓库设置
 * DELETE /api/v1/repos/[username]/[repoName] - 删除仓库
 */

import { NextRequest } from 'next/server';
import { success, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';
import { validateSensitiveOperation } from '@/lib/csrf';

// GET /api/v1/repos/[username]/[repoName] - 获取仓库详情
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string; repoName: string }> }
): Promise<Response> {
  try {
    const { username, repoName } = await params;

    const repo = await prisma.repository.findFirst({
      where: {
        owner: { username },
        name: repoName,
        deletedAt: null,
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            stars: true,
            watchers: true,
            forks: true,
            issues: { where: { status: 'open', isDeleted: false } },
            pullRequests: { where: { status: 'open', isDeleted: false } },
          },
        },
      },
    });

    if (!repo) {
      return error(ErrorCodes.NOT_FOUND, { message: '仓库不存在' });
    }

    // 私有仓库检查（visibility 0 = 私有）
    const auth = await getAuthUser(req);
    if (repo.visibility === 0 && (!auth || auth.userId !== repo.ownerId)) {
      return error(ErrorCodes.FORBIDDEN, { message: '私有仓库无法访问' });
    }

    // 增加浏览数
    await prisma.repository.update({
      where: { id: repo.id },
      data: { viewCount: { increment: 1 } },
    });

    return success({
      id: repo.id,
      name: repo.name,
      description: repo.description ?? undefined,
      visibility: repo.visibility === 1 ? 'public' : 'private',
      language: repo.language ?? undefined,
      starCount: repo.starCount,
      forkCount: repo.forkCount,
      watchCount: repo.watchCount,
      viewCount: repo.viewCount + 1,
      openIssueCount: repo._count.issues,
      openPullRequestCount: repo._count.pullRequests,
      owner: repo.owner,
      defaultBranch: repo.defaultBranch,
      createdAt: repo.createdAt.toISOString(),
      updatedAt: repo.updatedAt.toISOString(),
    });
  } catch (err) {
    return handlePrismaError(err, '获取仓库详情失败');
  }
}

// PATCH /api/v1/repos/[username]/[repoName] - 更新仓库设置
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ username: string; repoName: string }> }
): Promise<Response> {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return errors.unauthorized();
    }

    const { username, repoName } = await params;

    const repo = await prisma.repository.findFirst({
      where: {
        owner: { username },
        name: repoName,
        deletedAt: null,
      },
      select: { id: true, ownerId: true },
    });

    if (!repo) {
      return error(ErrorCodes.NOT_FOUND, { message: '仓库不存在' });
    }

    if (repo.ownerId !== auth.userId) {
      return error(ErrorCodes.FORBIDDEN, { message: '只有仓库所有者可以修改仓库设置' });
    }

    const body = await req.json();
    const { name, description, visibility, defaultBranch, language } = body;

    if (name && name !== repoName) {
      // 检查新名称是否被占用
      const existing = await prisma.repository.findFirst({
        where: {
          ownerId: repo.ownerId,
          name,
          deletedAt: null,
        },
      });
      if (existing) {
        return errors.conflict('仓库名称已被使用');
      }
    }

    // 处理可见性转换（API 接受 'private'/'public' 字符串或 0/1 数字）
    let visibilityValue: number | undefined;
    if (visibility !== undefined) {
      if (typeof visibility === 'string') {
        visibilityValue = visibility === 'private' ? 0 : 1;
      } else if (typeof visibility === 'number') {
        visibilityValue = visibility;
      }
    }

    const updated = await prisma.repository.update({
      where: { id: repo.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(visibilityValue !== undefined && { visibility: visibilityValue }),
        ...(defaultBranch !== undefined && { defaultBranch }),
        ...(language !== undefined && { language }),
      },
    });

    return success(updated, '仓库设置已更新');
  } catch (err) {
    return handlePrismaError(err, '更新仓库失败');
  }
}

// DELETE /api/v1/repos/[username]/[repoName] - 删除仓库
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ username: string; repoName: string }> }
): Promise<Response> {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return errors.unauthorized();
    }

    const { username, repoName } = await params;

    const repo = await prisma.repository.findFirst({
      where: {
        owner: { username },
        name: repoName,
        deletedAt: null,
      },
      select: { id: true, ownerId: true },
    });

    if (!repo) {
      return error(ErrorCodes.NOT_FOUND, { message: '仓库不存在' });
    }

    if (repo.ownerId !== auth.userId) {
      return error(ErrorCodes.FORBIDDEN, { message: '只有仓库所有者可以删除仓库' });
    }

    // 敏感操作验证：需要密码确认
    const body = await req.json().catch(() => ({}));
    const { password } = body;

    const validation = await validateSensitiveOperation(req, 'deleteRepository', {
      password,
    });

    if (!validation.valid) {
      return errors.forbidden(validation.error || '操作验证失败');
    }

    // 软删除
    await prisma.repository.update({
      where: { id: repo.id },
      data: { deletedAt: new Date() },
    });

    return success({ id: repo.id }, '仓库已删除');
  } catch (err) {
    return handlePrismaError(err, '删除仓库失败');
  }
}
