export const dynamic = 'force-dynamic';
/**
 * v1 仓库文件版本恢复 API
 * POST /api/v1/repos/[username]/[repoName]/versions/[fileId]/restore - 恢复到指定版本
 */

import { NextRequest } from 'next/server';
import { success, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';
import { recordActivityLog } from '@/lib/activity-log';
import crypto from 'crypto';

// POST /api/v1/repos/[username]/[repoName]/versions/[fileId]/restore
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ username: string; repoName: string; fileId: string }> }
): Promise<Response> {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return errors.unauthorized();
    }

    const { username, repoName, fileId } = await params;
    const body = await req.json();
    const { version, message } = body;

    if (!version || typeof version !== 'number') {
      return errors.badRequest('请指定要恢复的版本号');
    }

    // 获取仓库
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

    // 只有仓库所有者可以恢复文件
    if (repo.ownerId !== auth.userId) {
      return error(ErrorCodes.FORBIDDEN, { message: '只有仓库所有者可以恢复文件' });
    }

    // 获取文件记录
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
        content: true,
        fileHash: true,
        fileSize: true,
        branchId: true,
      },
    });

    if (!file) {
      return error(ErrorCodes.NOT_FOUND, { message: '文件不存在' });
    }

    // 获取要恢复的版本
    const targetVersion = await prisma.fileVersion.findFirst({
      where: { fileId, version },
      select: {
        version: true,
        content: true,
        fileHash: true,
        fileSize: true,
      },
    });

    if (!targetVersion) {
      return error(ErrorCodes.NOT_FOUND, { message: `版本 ${version} 不存在` });
    }

    // 获取最新版本号
    const latestVersionRecord = await prisma.fileVersion.findFirst({
      where: { fileId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const nextVersion = (latestVersionRecord?.version || 0) + 1;

    // 计算变化大小
    const currentSize = Number(file.fileSize);
    const targetSize = Number(targetVersion.fileSize);
    const changeSize = targetSize - currentSize;

    // 生成新内容的哈希
    const newHash = targetVersion.content
      ? crypto.createHash('sha256').update(targetVersion.content).digest('hex')
      : null;

    // 开启事务：保存当前版本 → 恢复文件 → 记录新版本
    await prisma.$transaction(async (tx) => {
      // 1. 保存当前内容为新版本（恢复前的快照）
      await tx.fileVersion.create({
        data: {
          fileId,
          version: nextVersion,
          content: file.content,
          fileHash: file.fileHash,
          fileSize: file.fileSize,
          changeSize: BigInt(currentSize - targetSize), // 与目标版本的差异
          message: message || `恢复到版本 ${version}`,
        },
      });

      // 2. 恢复文件内容
      const restored = await tx.repoItem.update({
        where: { id: fileId },
        data: {
          content: targetVersion.content,
          fileHash: targetVersion.fileHash,
          fileSize: targetVersion.fileSize,
        },
        select: {
          id: true,
          name: true,
          content: true,
          fileHash: true,
          fileSize: true,
          updatedAt: true,
        },
      });

      // 3. 创建恢复记录版本
      await tx.fileVersion.create({
        data: {
          fileId,
          version: nextVersion + 1,
          content: targetVersion.content,
          fileHash: targetVersion.fileHash,
          fileSize: targetVersion.fileSize,
          changeSize: BigInt(changeSize),
          message: message || `从版本 ${version} 恢复`,
        },
      });

      return restored;
    });

    // 记录活动日志
    await recordActivityLog({
      userId: auth.userId,
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
      content: targetVersion.content,
      fileHash: targetVersion.fileHash,
      fileSize: Number(targetVersion.fileSize),
      restoredFromVersion: version,
      newVersion: nextVersion + 1,
      message: `已成功恢复到版本 ${version}`,
    }, '文件恢复成功');
  } catch (err) {
    return handlePrismaError(err, '恢复文件版本失败');
  }
}
