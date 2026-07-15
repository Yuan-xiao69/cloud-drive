export const dynamic = 'force-dynamic';
/**
 * v1 仓库文件版本恢复 API
 * POST /api/v1/repos/[username]/[repoName]/versions/[fileId]/restore - 恢复到指定版本
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { defineRoute } from '@/lib/framework/define-route';
import { success, error, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/lib/api/v1';
import { recordActivityLog } from '@/lib/activity-log';
import { getUserRepoRole, canWrite } from '@/lib/auth/repo-permission';
import crypto from 'crypto';

const restoreVersionSchema = z.object({
  version: z.number(),
  message: z.string().optional(),
});

// POST /api/v1/repos/[username]/[repoName]/versions/[fileId]/restore
export const POST = defineRoute({
  auth: 'required',
  validation: restoreVersionSchema,
  handler: async ({ req, user, body, params }) => {
    const { username, repoName, fileId } = params;
    const { version, message } = body as z.infer<typeof restoreVersionSchema>;

    if (!version || typeof version !== 'number') {
      return errors.badRequest('请指定要恢复的版本号');
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
      return error(ErrorCodes.FORBIDDEN, { message: '无权恢复文件版本' });
    }

    const file = await prisma.repoItem.findFirst({
      where: {
        id: fileId,
        repoId: repo.id,
        isDeleted: false,
        type: 'file',
      },
      select: {
        id: true,
        name: true,
        storagePath: true,
        fileHash: true,
        fileSize: true,
        branchId: true,
      },
    });

    if (!file) {
      return error(ErrorCodes.NOT_FOUND, { message: '文件不存在' });
    }

    const targetVersion = await prisma.fileVersion.findFirst({
      where: { fileId, version },
      select: {
        version: true,
        storagePath: true,
        fileHash: true,
        fileSize: true,
      },
    });

    if (!targetVersion) {
      return error(ErrorCodes.NOT_FOUND, { message: `版本 ${version} 不存在` });
    }

    const latestVersionRecord = await prisma.fileVersion.findFirst({
      where: { fileId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const nextVersion = (latestVersionRecord?.version || 0) + 1;

    const currentSize = Number(file.fileSize);
    const targetSize = Number(targetVersion.fileSize);
    const changeSize = targetSize - currentSize;

    const versionKey = targetVersion.storagePath;

    await prisma.$transaction(async (tx) => {
      await tx.fileVersion.create({
        data: {
          fileId,
          version: nextVersion,
          storagePath: file.storagePath,
          fileHash: file.fileHash,
          fileSize: file.fileSize,
          changeSize: BigInt(currentSize - targetSize),
          message: message || `恢复到版本 ${version}`,
        },
      });

      await tx.repoItem.update({
        where: { id: fileId },
        data: {
          storagePath: targetVersion.storagePath,
          fileHash: targetVersion.fileHash,
          fileSize: targetVersion.fileSize,
        },
      });

      await tx.fileVersion.create({
        data: {
          fileId,
          version: nextVersion + 1,
          storagePath: targetVersion.storagePath,
          fileHash: targetVersion.fileHash,
          fileSize: targetVersion.fileSize,
          changeSize: BigInt(changeSize),
          message: message || `从版本 ${version} 恢复`,
        },
      });
    });

    await recordActivityLog({
      userId: user!.id,
      action: 'restore_version',
      targetType: 'file',
      targetId: fileId,
      targetName: file.name,
      details: {
        restoredFromVersion: version,
        newVersion: nextVersion + 1,
        message: message || `从版本 ${version} 恢复`,
      },
    });

    return success({
      id: fileId,
      name: file.name,
      fileHash: targetVersion.fileHash,
      fileSize: Number(targetVersion.fileSize),
      restoredFromVersion: version,
      newVersion: nextVersion + 1,
      message: `已成功恢复到版本 ${version}`,
    }, '文件恢复成功');
  },
});
