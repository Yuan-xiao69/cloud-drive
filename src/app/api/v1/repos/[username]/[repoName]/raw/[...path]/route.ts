export const dynamic = 'force-dynamic';
/**
 * v1 仓库文件 Raw 下载 API
 * GET /api/v1/repos/[username]/[repoName]/raw/[...path] - 获取原始文件内容
 */

import { NextRequest } from 'next/server';
import { error, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/lib/api/v1';
import { getAuthUser } from '@/lib/auth';

// GET /api/v1/repos/[username]/[repoName]/raw/[...path] - 获取原始文件内容
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string; repoName: string; path: string[] }> }
): Promise<Response> {
  try {
    const { username, repoName, path: pathSegments } = await params;
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get('branch') || undefined;

    // 查找仓库
    const repo = await prisma.repository.findFirst({
      where: {
        owner: { username },
        name: repoName,
        deletedAt: null,
      },
      select: {
        id: true,
        ownerId: true,
        visibility: true,
        defaultBranch: true,
      },
    });

    if (!repo) {
      return error(ErrorCodes.NOT_FOUND, { message: '仓库不存在' });
    }

    // 私有仓库需要认证
    if (repo.visibility !== 1) {
      const auth = await getAuthUser(req);
      if (!auth) {
        return errors.unauthorized('私有仓库需要登录');
      }
    }

    // 查找分支
    let branchId: string | null = null;
    if (branch) {
      const branchRecord = await prisma.branch.findFirst({
        where: {
          repoId: repo.id,
          name: branch,
        },
        select: { id: true },
      });
      branchId = branchRecord?.id ?? null;
    }

    // 构建路径查询
    const fileName = pathSegments[pathSegments.length - 1];
    const parentPath = pathSegments.slice(0, -1);
    const parentName = parentPath.length > 0 ? parentPath[parentPath.length - 1] : '';

    // 查找文件
    const where: Record<string, unknown> = {
      repoId: repo.id,
      name: fileName,
      type: 'file',
      isDeleted: false,
    };

    if (branchId) {
      where.branchId = branchId;
    }

    // 查找父目录
    const parent = parentName
      ? await prisma.repoItem.findFirst({
          where: {
            repoId: repo.id,
            branchId: branchId ?? undefined,
            name: parentName,
            type: 'dir',
            isDeleted: false,
          },
          select: { id: true },
        })
      : null;

    where.parentId = parent?.id ?? null;

    // 如果没有分支限制，尝试默认分支
    if (!branchId) {
      const mainBranch = await prisma.branch.findFirst({
        where: {
          repoId: repo.id,
          isDefault: true,
        },
        select: { id: true },
      });
      if (mainBranch) {
        where.branchId = mainBranch.id;
        // 重新查找父目录
        if (parentName) {
          const parentWithBranch = await prisma.repoItem.findFirst({
            where: {
              repoId: repo.id,
              branchId: mainBranch.id,
              name: parentName,
              type: 'dir',
              isDeleted: false,
            },
            select: { id: true },
          });
          where.parentId = parentWithBranch?.id ?? null;
        }
      }
    }

    const file = await prisma.repoItem.findFirst({
      where,
      select: {
        id: true,
        content: true,
        mimeType: true,
        fileSize: true,
        name: true,
      },
    });

    if (!file) {
      return error(ErrorCodes.NOT_FOUND, { message: '文件不存在' });
    }

    // 直接返回原始内容
    return new Response(file.content || '', {
      headers: {
        'Content-Type': file.mimeType || 'text/plain',
        'Content-Length': String(file.content?.length || 0),
        'Content-Disposition': `inline; filename="${file.name}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    console.error('[v1/raw] Error:', err);
    return error(ErrorCodes.INTERNAL_ERROR, { message: '获取文件失败' });
  }
}
