export const dynamic = 'force-dynamic';
/**
 * v1 仓库文件树 API
 * GET /api/v1/repos/[username]/[repoName]/tree - 获取仓库文件树
 */

import { NextRequest } from 'next/server';
import { success, error, handlePrismaError } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';

// GET /api/v1/repos/[username]/[repoName]/tree
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string; repoName: string }> }
): Promise<Response> {
  try {
    const { username, repoName } = await params;
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get('branch') || 'main';
    const parentId = searchParams.get('parentId') || null;
    const path = searchParams.get('path');

    const repo = await prisma.repository.findFirst({
      where: {
        owner: { username },
        name: repoName,
        deletedAt: null,
      },
      select: { id: true, ownerId: true, visibility: true },
    });

    if (!repo) {
      return error(ErrorCodes.NOT_FOUND, { message: '仓库不存在' });
    }

    // 检查访问权限
    const auth = await getAuthUser(req);
    if (repo.visibility === 0 && (!auth || auth.userId !== repo.ownerId)) {
      return error(ErrorCodes.FORBIDDEN, { message: '私有仓库无法访问' });
    }

    // 查找分支
    const branchRecord = await prisma.branch.findFirst({
      where: {
        repoId: repo.id,
        name: branch,
      },
      select: { id: true, name: true },
    });

    if (!branchRecord) {
      return error(ErrorCodes.NOT_FOUND, { message: `分支 ${branch} 不存在` });
    }

    // 如果提供了 path，查找对应的 folder
    let targetParentId = parentId;
    if (path && path !== '/') {
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      const normalizedRepoName = repoName.startsWith('/') ? repoName : `/${repoName}`;
      const fullPath = `${normalizedRepoName}${normalizedPath}`;

      const folder = await prisma.repoItem.findFirst({
        where: {
          repoId: repo.id,
          branchId: branchRecord.id,
          path: fullPath,
          type: 'folder',
          isDeleted: false,
        },
        select: { id: true },
      });

      if (!folder) {
        return error(ErrorCodes.NOT_FOUND, { message: '路径不存在' });
      }
      targetParentId = folder.id;
    }

    // 获取文件列表
    const files = await prisma.repoItem.findMany({
      where: {
        repoId: repo.id,
        branchId: branchRecord.id,
        parentId: targetParentId,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        type: true,
        fileSize: true,
        mimeType: true,
        path: true,
        depth: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { type: 'asc' },   // folder 优先
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    const items = files.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      size: f.fileSize.toString(),
      mimeType: f.mimeType ?? undefined,
      path: f.path,
      depth: f.depth,
      sortOrder: f.sortOrder,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    }));

    return success({
      branch: branchRecord.name,
      parentId: targetParentId,
      path: path || '/',
      items,
      total: items.length,
    });
  } catch (err) {
    return handlePrismaError(err, '获取文件树失败');
  }
}
