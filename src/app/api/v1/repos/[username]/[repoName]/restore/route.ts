export const dynamic = 'force-dynamic';
/**
 * v1 仓库文件恢复 API
 * POST /api/v1/repos/[username]/[repoName]/restore - 恢复已删除的文件
 */

import { NextRequest } from 'next/server';
import { success, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';
import { recordActivityLog } from '@/lib/activity-log';

// POST /api/v1/repos/[username]/[repoName]/restore
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
    const body = await req.json();
    const { fileId, path, branch } = body;

    if (!fileId && !path) {
      return errors.badRequest('请提供 fileId 或 path');
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

    // 确定分支
    const branchName = branch || 'main';

    // 查找分支
    const branchRecord = await prisma.branch.findFirst({
      where: { repoId: repo.id, name: branchName },
      select: { id: true, name: true },
    });

    if (!branchRecord) {
      return error(ErrorCodes.NOT_FOUND, { message: `分支 ${branchName} 不存在` });
    }

    // 查找已删除的文件
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

    // 检查目标路径是否已有未删除的文件
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

    // 恢复文件
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

    // 记录活动日志
    await recordActivityLog({
      userId: auth.userId,
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
  } catch (err) {
    return handlePrismaError(err, '恢复文件失败');
  }
}

// GET /api/v1/repos/[username]/[repoName]/restore - 获取可恢复的文件列表
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string; repoName: string }> }
): Promise<Response> {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return errors.unauthorized();
    }

    const { username, repoName } = await params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const branch = searchParams.get('branch') || 'main';

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

    // 只有仓库所有者可以查看恢复列表
    if (repo.ownerId !== auth.userId) {
      return error(ErrorCodes.FORBIDDEN, { message: '只有仓库所有者可以查看恢复列表' });
    }

    // 查找分支
    const branchRecord = await prisma.branch.findFirst({
      where: { repoId: repo.id, name: branch },
      select: { id: true, name: true },
    });

    if (!branchRecord) {
      return error(ErrorCodes.NOT_FOUND, { message: `分支 ${branch} 不存在` });
    }

    // 获取已删除文件列表
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
  } catch (err) {
    return handlePrismaError(err, '获取恢复列表失败');
  }
}
