export const dynamic = 'force-dynamic';
/**
 * v1 仓库文件 Raw 下载 API
 * GET /api/v1/repos/[username]/[repoName]/raw/[...path] - 获取原始文件内容
 */

import { NextRequest } from 'next/server';
import { defineRoute } from '@/lib/framework/define-route';
import { error, ErrorCodes } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getFileStream } from '@/lib/storage';
import { checkRepoAccess } from '@/lib/auth/access';

// GET /api/v1/repos/[username]/[repoName]/raw/[...path] - 获取原始文件内容
export const GET = defineRoute({
  auth: 'optional',
  handler: async ({ req, params }) => {
    const { username, repoName } = params;
    const pathSegments = params.path as unknown as string[];
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get('branch') || undefined;

    const access = await checkRepoAccess(req, { username, repoName }, 'read');
    if (!access.allowed) return access.error;

    const repo = access.repo;

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
        storagePath: true,
        mimeType: true,
        fileSize: true,
        name: true,
      },
    });

    if (!file) {
      return error(ErrorCodes.NOT_FOUND, { message: '文件不存在' });
    }

    // 从 MinIO 流式读取
    if (file.storagePath) {
      const streamResult = await getFileStream(file.storagePath);
      if (streamResult) {
        return new Response(streamResult.stream as unknown as ReadableStream, {
          headers: {
            'Content-Type': streamResult.contentType,
            'Content-Length': String(streamResult.contentLength),
            'Content-Disposition': `inline; filename="${file.name}"`,
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }
    }

    return error(ErrorCodes.NOT_FOUND, { message: '文件内容不可用' });
  },
});
