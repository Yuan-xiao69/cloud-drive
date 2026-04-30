export const dynamic = 'force-dynamic';
/**
 * v1 仓库文件 Blob API
 * GET /api/v1/repos/[username]/[repoName]/blob/[...path] - 获取文件内容
 */

import { NextRequest } from 'next/server';
import { success, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/lib/api/v1';
import { getAuthUser } from '@/lib/auth';

// GET /api/v1/repos/[username]/[repoName]/blob/[...path] - 获取文件内容
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string; repoName: string; path: string[] }> }
): Promise<Response> {
  try {
    const { username, repoName, path: pathSegments } = await params;
    const filePath = '/' + pathSegments.join('/');
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
    let branchRecord: { id: string } | null = null;
    if (branch) {
      branchRecord = await prisma.branch.findFirst({
        where: {
          repoId: repo.id,
          name: branch,
        },
        select: { id: true },
      });
    } else {
      // 默认查找主分支
      branchRecord = await prisma.branch.findFirst({
        where: {
          repoId: repo.id,
          isDefault: true,
        },
        select: { id: true },
      });
      if (!branchRecord) {
        // 尝试第一个分支
        branchRecord = await prisma.branch.findFirst({
          where: { repoId: repo.id },
          select: { id: true },
          orderBy: { createdAt: 'asc' },
        });
      }
    }

    if (!branchRecord) {
      return error(ErrorCodes.NOT_FOUND, { message: '仓库分支不存在' });
    }

    const branchId = branchRecord.id;
    const fileName = pathSegments[pathSegments.length - 1];
    const parentPathSegments = pathSegments.slice(0, -1);

    // 从外向内逐层查找父目录
    let currentParentId: string | null = null;
    let foundAllDirs = true;

    for (let i = 0; i < parentPathSegments.length; i++) {
      const segmentName = parentPathSegments[i];

      const dir = await prisma.repoItem.findFirst({
        where: {
          repoId: repo.id,
          branchId: branchId,
          name: segmentName,
          type: 'dir',
          isDeleted: false,
          parentId: currentParentId,
        },
        select: { id: true },
      });

      if (!dir) {
        foundAllDirs = false;
        break;
      }

      currentParentId = dir.id;
    }

    // 查找文件
    const file = await prisma.repoItem.findFirst({
      where: {
        repoId: repo.id,
        branchId: branchId,
        parentId: foundAllDirs ? currentParentId : undefined,
        name: fileName,
        type: 'file',
        isDeleted: false,
        ...(foundAllDirs ? {} : {
          // 如果没有找到所有父目录，使用路径匹配
          path: filePath,
        }),
      },
      select: { id: true, content: true, mimeType: true, fileSize: true, name: true },
    });

    // 如果找不到，尝试模糊匹配
    if (!file && foundAllDirs) {
      const allFilesInParent = await prisma.repoItem.findMany({
        where: {
          repoId: repo.id,
          branchId: branchId,
          parentId: currentParentId,
          type: 'file',
          isDeleted: false,
        },
        select: { id: true, content: true, mimeType: true, fileSize: true, name: true },
      });
      
      // 尝试匹配文件名
      const matchedFile = allFilesInParent.find(f => 
        f.name === fileName || 
        decodeURIComponent(f.name) === fileName ||
        f.name === decodeURIComponent(fileName)
      );
      
      if (matchedFile) {
        const contentBase64 = matchedFile.content
          ? Buffer.from(matchedFile.content).toString('base64')
          : '';

        return success({
          content: contentBase64,
          mimeType: matchedFile.mimeType || 'application/octet-stream',
          name: matchedFile.name,
          size: Number(matchedFile.fileSize),
          path: filePath,
        });
      }
    }

    if (file) {
      // Base64 编码内容
      const contentBase64 = file.content
        ? Buffer.from(file.content).toString('base64')
        : '';

      return success({
        content: contentBase64,
        mimeType: file.mimeType || 'application/octet-stream',
        name: file.name,
        size: Number(file.fileSize),
        path: filePath,
      });
    }

    return error(ErrorCodes.NOT_FOUND, { message: '文件不存在' });
  } catch (err) {
    return handlePrismaError(err, '获取文件内容失败');
  }
}
