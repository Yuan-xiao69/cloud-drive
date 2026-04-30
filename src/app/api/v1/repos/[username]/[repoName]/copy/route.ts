export const dynamic = 'force-dynamic';
/**
 * v1 仓库文件复制 API
 * POST /api/v1/repos/[username]/[repoName]/copy - 复制文件或文件夹到目标路径
 */

import { NextRequest } from 'next/server';
import { success, created, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';

interface CopySource {
  sourcePath: string;
  targetPath: string;
}

interface CopyRequest {
  sources: CopySource[];
  branch: string;
  recursive?: boolean;
}

// POST /api/v1/repos/[username]/[repoName]/copy
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ username: string; repoName: string }> }
): Promise<Response> {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return errors.unauthorized();
    }

    const { username, repoName } = await params;
    const body: CopyRequest = await req.json();
    const { sources, branch, recursive = true } = body;

    if (!sources || !Array.isArray(sources) || sources.length === 0) {
      return errors.badRequest('请提供要复制的源文件列表');
    }

    if (!branch) {
      return errors.badRequest('分支名称不能为空');
    }

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

    // 只有仓库所有者可以复制文件
    if (repo.ownerId !== auth.userId) {
      return error(ErrorCodes.FORBIDDEN, { message: '只有仓库所有者可以复制文件' });
    }

    // 查找分支
    const branchRecord = await prisma.branch.findFirst({
      where: { repoId: repo.id, name: branch },
      select: { id: true, name: true },
    });

    if (!branchRecord) {
      return error(ErrorCodes.NOT_FOUND, { message: `分支 ${branch} 不存在` });
    }

    // 将 repo 和 branchRecord 提取为局部常量，确保 TypeScript 正确推断
    const repoId = repo.id;
    const branchId = branchRecord.id;

    const results = {
      success: 0 as number,
      failed: 0 as number,
      errors: [] as string[],
    };

    // 递归复制文件/文件夹
    async function copyItem(sourcePath: string, targetPath: string): Promise<void> {
      // 查找源文件/文件夹
      const sourceItems = await prisma.repoItem.findMany({
        where: {
          repoId: repoId,
          branchId: branchId,
          path: sourcePath,
          isDeleted: false,
        },
      });

      if (sourceItems.length === 0) {
        throw new Error(`源路径不存在: ${sourcePath}`);
      }

      const sourceItem = sourceItems[0];

      // 检查目标是否已存在
      const existingTarget = await prisma.repoItem.findFirst({
        where: {
          repoId: repoId,
          branchId: branchId,
          path: targetPath,
          isDeleted: false,
        },
      });

      if (existingTarget) {
        throw new Error(`目标路径已存在: ${targetPath}`);
      }

      // 复制单个文件/文件夹
      await prisma.repoItem.create({
        data: {
          repoId: repoId,
          branchId: branchId,
          name: targetPath.split('/').pop() || '',
          type: sourceItem.type,
          content: sourceItem.content,
          fileHash: sourceItem.fileHash,
          fileSize: sourceItem.fileSize,
          mimeType: sourceItem.mimeType,
          storagePath: sourceItem.storagePath,
          linkUrl: sourceItem.linkUrl,
          depth: (targetPath.match(/\//g) || []).length,
          path: targetPath,
        },
      });

      // 如果是文件夹且需要递归复制子项
      if (sourceItem.type === 'folder' && recursive) {
        const children = await prisma.repoItem.findMany({
          where: {
            repoId: repoId,
            branchId: branchId,
            parentId: sourceItem.id,
            isDeleted: false,
          },
        });

        for (const child of children) {
          const childTargetPath = `${targetPath}/${child.name}`;
          await copyItem(child.path!, childTargetPath);
        }
      }

      return;
    }

    // 处理每个复制请求
    for (const { sourcePath, targetPath } of sources) {
      try {
        await copyItem(sourcePath, targetPath);
        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push(`${sourcePath}: ${err instanceof Error ? err.message : '复制失败'}`);
      }
    }

    return success({
      summary: {
        success: results.success,
        failed: results.failed,
      },
      errors: results.errors.length > 0 ? results.errors : undefined,
    }, `复制完成：成功 ${results.success}，失败 ${results.failed}`);
  } catch (err) {
    return handlePrismaError(err, '复制文件失败');
  }
}
