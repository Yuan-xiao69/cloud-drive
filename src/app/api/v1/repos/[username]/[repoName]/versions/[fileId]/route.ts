export const dynamic = 'force-dynamic';
/**
 * v1 仓库文件版本历史 API
 * GET /api/v1/repos/[username]/[repoName]/versions/[fileId] - 获取文件版本列表
 */

import { NextRequest } from 'next/server';
import { defineRoute } from '@/lib/framework/define-route';
import { success, error } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/lib/api/v1';

// GET /api/v1/repos/[username]/[repoName]/versions/[fileId]
export const GET = defineRoute({
  auth: 'required',
  handler: async ({ req, user, params }) => {
    const { username, repoName, fileId } = params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

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
      },
    });

    if (!repo) {
      return error(ErrorCodes.NOT_FOUND, { message: '仓库不存在' });
    }

    // 检查访问权限
    const isOwner = repo.ownerId === user!.id;
    const isPublic = repo.visibility === 1;

    if (!isOwner && !isPublic) {
      return error(ErrorCodes.FORBIDDEN, { message: '无权访问此仓库' });
    }

    const file = await prisma.repoItem.findFirst({
      where: {
        id: fileId,
        repoId: repo.id,
        type: 'file',
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        path: true,
      },
    });

    if (!file) {
      return error(ErrorCodes.NOT_FOUND, { message: '文件不存在' });
    }

    const [versions, total] = await Promise.all([
      prisma.fileVersion.findMany({
        where: { fileId },
        orderBy: { version: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          version: true,
          fileSize: true,
          changeSize: true,
          message: true,
          createdAt: true,
        },
      }),
      prisma.fileVersion.count({ where: { fileId } }),
    ]);

    const currentFile = await prisma.repoItem.findUnique({
      where: { id: fileId },
      select: {
        fileSize: true,
        fileHash: true,
        updatedAt: true,
      },
    });

    const latestVersion = await prisma.fileVersion.findFirst({
      where: { fileId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    return success({
      file: {
        id: file.id,
        name: file.name,
        path: file.path,
        currentSize: currentFile?.fileSize ? Number(currentFile.fileSize) : 0,
        currentHash: currentFile?.fileHash || null,
        updatedAt: currentFile?.updatedAt?.toISOString() || null,
      },
      currentVersion: latestVersion?.version || 0,
      versions: versions.map((v) => ({
        id: v.id,
        version: v.version,
        fileSize: Number(v.fileSize),
        changeSize: Number(v.changeSize),
        message: v.message,
        createdAt: v.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  },
});
