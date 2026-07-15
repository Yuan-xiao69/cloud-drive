export const dynamic = 'force-dynamic';
/**
 * v1 仓库批量操作 API
 * POST /api/v1/repos/[username]/[repoName]/batch - 批量操作文件
 *   action=delete - 批量删除文件
 *   action=move   - 批量移动文件
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { defineRoute } from '@/lib/framework/define-route';
import { success, error, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/lib/api/v1';
import { getUserRepoRole, canWrite } from '@/lib/auth/repo-permission';

const batchSchema = z.object({
  action: z.string().min(1),
  fileIds: z.array(z.string()).min(1, '请提供要操作的文件 ID 列表'),
  targetParentId: z.string().optional(),
  branch: z.string().min(1, '分支名称不能为空'),
});

// POST /api/v1/repos/[username]/[repoName]/batch
export const POST = defineRoute({
  auth: 'required',
  validation: batchSchema,
  handler: async ({ req, user, body, params }) => {
    const { username, repoName } = params;
    const { action, fileIds, targetParentId, branch } = body as z.infer<typeof batchSchema>;

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
      return error(ErrorCodes.FORBIDDEN, { message: '无权执行批量操作' });
    }

    const branchRecord = await prisma.branch.findFirst({
      where: { repoId: repo.id, name: branch },
      select: { id: true },
    });

    if (!branchRecord) {
      return error(ErrorCodes.NOT_FOUND, { message: `分支 ${branch} 不存在` });
    }

    // action=delete: 批量删除
    if (action === 'delete') {
      await prisma.repoItem.updateMany({
        where: {
          id: { in: fileIds },
          repoId: repo.id,
          branchId: branchRecord.id,
          isDeleted: false,
        },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      return success({ deleted: fileIds.length }, `已删除 ${fileIds.length} 个文件`);
    }

    // action=move: 批量移动
    if (action === 'move') {
      if (!targetParentId) {
        return errors.badRequest('移动操作需要提供 targetParentId');
      }

      await prisma.repoItem.updateMany({
        where: {
          id: { in: fileIds },
          repoId: repo.id,
          branchId: branchRecord.id,
          isDeleted: false,
        },
        data: { parentId: targetParentId },
      });

      return success({ moved: fileIds.length }, `已移动 ${fileIds.length} 个文件`);
    }

    return errors.badRequest('未知的 action，支持: delete, move');
  },
});
