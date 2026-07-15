export const dynamic = 'force-dynamic';
/**
 * v1 仓库文件恢复 API
 * POST /api/v1/repos/[username]/[repoName]/restore - 恢复已删除的文件
 * GET /api/v1/repos/[username]/[repoName]/restore - 获取可恢复的文件列表
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { defineRoute } from '@/lib/framework/define-route';
import { success, error, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/lib/api/v1';
import { recordActivityLog } from '@/lib/activity-log';
import { getUserRepoRole, canWrite } from '@/lib/auth/repo-permission';

const restoreSchema = z.object({
  fileId: z.string().optional(),
  path: z.string().optional(),
  branch: z.string().optional(),
});

// POST /api/v1/repos/[username]/[repoName]/restore
export const POST = defineRoute({
  auth: 'required',
  validation: restoreSchema,
  handler: async ({ req, user, body, params }) => {
    const { username, repoName } = params;
    const { fileId, path, branch } = body as z.infer<typeof restoreSchema>;

    if (!fileId && !path) {
      return errors.badRequest('请提供 fileId 或 path');
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

    const userRole = await getUserRepoRole(user!.id, repo.id);
    if (!canWrite(userRole)) {
      return error(ErrorCodes.FORBIDDEN, { message: '无权恢复文件' });
    }

    const branchName = branch || 'main';

    const branchRecord = await prisma.branch.findFirst({
      where: { repoId: repo.id, name: branchName },
      select: { id: true, name: true },
    });

    if (!branchRecord) {
      return error(ErrorCodes.NOT_FOUND, { message: `分支 ${branchName} 不存在` });
    }

    let deletedFile;
    if (fileId) {
      deletedFile = await prisma.repoItem.findFirst({
        where: {
          id: fileId,
          repoId: repo.id,
          isDeleted: true,
        },
      });
    } else {
      deletedFile = await prisma.repoItem.findFirst({
        where: {
          repoId: repo.id,
          branchId: branchRecord.id,
          path,
          isDeleted: true,
        },
      });
    }

    if (!deletedFile) {
      return error(ErrorCodes.NOT_FOUND, { message: '找不到已删除的文件' });
    }

    const existingFile = await prisma.repoItem.findFirst({
      where: {
        repoId: repo.id,
        branchId: branchRecord.id,
        path: deletedFile.path,
        isDeleted: false,
      },
    });

    if (existingFile) {
      return errors.conflict('文件已在目标位置存在，请先删除现有文件');
    }

    const restoredFile = await prisma.repoItem.update({
      where: { id: deletedFile.id },
      data: { isDeleted: false },
      select: {
        id: true,
        name: true,
        type: true,
        path: true,
        fileSize: true,
        updatedAt: true,
      },
    });

    await recordActivityLog({
      userId: user!.id,
      action: 'restore',
      targetType: 'file',
      targetId: restoredFile.id,
      targetName: restoredFile.name,
      details: {
        originalPath: deletedFile.path,
        branch: branchName,
      },
    });

    return success({
      id: restoredFile.id,
      name: restoredFile.name,
      type: restoredFile.type,
      path: restoredFile.path,
      size: Number(restoredFile.fileSize),
      restoredAt: restoredFile.updatedAt.toISOString(),
    }, '文件恢复成功');
  },
});

// GET /api/v1/repos/[username]/[repoName]/restore - 获取可恢复的文件列表
export const GET = defineRoute({
  auth: 'required',
  handler: async ({ req, user, params }) => {
    const { username, repoName } = params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const branch = searchParams.get('branch') || 'main';

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
      return error(ErrorCodes.FORBIDDEN, { message: '无权查看恢复列表' });
    }

    const branchRecord = await prisma.branch.findFirst({
      where: { repoId: repo.id, name: branch },
      select: { id: true, name: true },
    });

    if (!branchRecord) {
      return error(ErrorCodes.NOT_FOUND, { message: `分支 ${branch} 不存在` });
    }

    const [files, total] = await Promise.all([
      prisma.repoItem.findMany({
        where: {
          repoId: repo.id,
          branchId: branchRecord.id,
          isDeleted: true,
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          type: true,
          path: true,
          fileSize: true,
          mimeType: true,
          updatedAt: true,
        },
      }),
      prisma.repoItem.count({
        where: {
          repoId: repo.id,
          branchId: branchRecord.id,
          isDeleted: true,
        },
      }),
    ]);

    return success({
      files,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  },
});
