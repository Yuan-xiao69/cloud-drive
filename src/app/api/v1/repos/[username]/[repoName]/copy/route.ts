export const dynamic = 'force-dynamic';
/**
 * v1 仓库文件复制 API
 * POST /api/v1/repos/[username]/[repoName]/copy - 复制文件或文件夹到目标路径
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { defineRoute } from '@/lib/framework/define-route';
import { success, error, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/lib/api/v1';
import { getUserRepoRole, canWrite } from '@/lib/auth/repo-permission';

const copySourceSchema = z.object({
  sourcePath: z.string(),
  targetPath: z.string(),
});

const copyRequestSchema = z.object({
  sources: z.array(copySourceSchema).min(1, '请提供要复制的源文件列表'),
  branch: z.string().min(1, '分支名称不能为空'),
  recursive: z.boolean().optional(),
});

// POST /api/v1/repos/[username]/[repoName]/copy
export const POST = defineRoute({
  auth: 'required',
  validation: copyRequestSchema,
  handler: async ({ user, body, params }) => {
    const { username, repoName } = params;
    const { sources, branch, recursive = true } = body as z.infer<typeof copyRequestSchema>;

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

    const userRole = await getUserRepoRole(user!.id, repo.id);
    if (!canWrite(userRole)) {
      return error(ErrorCodes.FORBIDDEN, { message: '无权复制文件' });
    }

    const branchRecord = await prisma.branch.findFirst({
      where: { repoId: repo.id, name: branch },
      select: { id: true, name: true },
    });

    if (!branchRecord) {
      return error(ErrorCodes.NOT_FOUND, { message: `分支 ${branch} 不存在` });
    }

    const repoId = repo.id;
    const branchId = branchRecord.id;

    const results = {
      success: 0 as number,
      failed: 0 as number,
      errors: [] as string[],
    };

    async function copyItem(sourcePath: string, targetPath: string): Promise<void> {
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

      await prisma.repoItem.create({
        data: {
          repoId: repoId,
          branchId: branchId,
          name: targetPath.split('/').pop() || '',
          type: sourceItem.type,
          fileHash: sourceItem.fileHash,
          fileSize: sourceItem.fileSize,
          mimeType: sourceItem.mimeType,
          storagePath: sourceItem.storagePath,
          linkUrl: sourceItem.linkUrl,
          depth: (targetPath.match(/\//g) || []).length,
          path: targetPath,
        },
      });

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
  },
});
