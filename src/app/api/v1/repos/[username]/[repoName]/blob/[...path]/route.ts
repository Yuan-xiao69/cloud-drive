export const dynamic = 'force-dynamic';
/**
 * v1 仓库文件 Blob API
 * GET /api/v1/repos/[username]/[repoName]/blob/[...path] - 获取文件内容
 */

import { NextRequest } from 'next/server';
import { defineRoute } from '@/lib/framework/define-route';
import { success, error } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/lib/api/v1';
import { getFile } from '@/lib/storage';
import { checkRepoAccess } from '@/lib/auth/access';

// GET /api/v1/repos/[username]/[repoName]/blob/[...path] - 获取文件内容
export const GET = defineRoute({
  auth: 'optional',
  handler: async ({ req, params }) => {
    const { username, repoName } = params;
    const pathSegments = params.path as unknown as string[];
    const filePath = '/' + pathSegments.join('/');
    const { searchParams } = new URL(req.url);
    const branch = searchParams.get('branch') || undefined;

    const access = await checkRepoAccess(req, { username, repoName }, 'read');
    if (!access.allowed) return access.error;

    const repo = access.repo;

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
      branchRecord = await prisma.branch.findFirst({
        where: {
          repoId: repo.id,
          isDefault: true,
        },
        select: { id: true },
      });
      if (!branchRecord) {
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

    let currentParentId: string | null = null;
    let foundAllDirs = true;

    for (let i = 0; i < parentPathSegments.length; i++) {
      const segmentName = parentPathSegments[i];

      const dir: { id: string } | null = await prisma.repoItem.findFirst({
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

    const file = await prisma.repoItem.findFirst({
      where: {
        repoId: repo.id,
        branchId: branchId,
        parentId: foundAllDirs ? currentParentId : undefined,
        name: fileName,
        type: 'file',
        isDeleted: false,
        ...(foundAllDirs ? {} : {
          path: filePath,
        }),
      },
      select: { id: true, storagePath: true, mimeType: true, fileSize: true, name: true, path: true },
    });

    const repoId = repo.id;
    async function readContent(target: { storagePath?: string | null }) {
      if (target.storagePath) {
        const buf = await getFile(target.storagePath);
        if (buf) return buf.toString('base64');
      }
      const chunks = await prisma.repoFileChunk.findMany({
        where: { repoId, branchId, fileName, status: 'completed' },
        orderBy: { chunkIndex: 'asc' },
        select: { chunkData: true },
      });
      return chunks.map(c => c.chunkData).join('') || '';
    }

    if (file) {
      const contentBase64 = await readContent(file);
      return success({
        content: contentBase64,
        mimeType: file.mimeType || 'application/octet-stream',
        name: file.name,
        size: Number(file.fileSize),
        path: filePath,
      });
    }

    // 模糊匹配降级
    if (foundAllDirs) {
      const allFilesInParent = await prisma.repoItem.findMany({
        where: { repoId: repo.id, branchId, parentId: currentParentId, type: 'file', isDeleted: false },
        select: { id: true, storagePath: true, mimeType: true, fileSize: true, name: true },
      });
      const matchedFile = allFilesInParent.find(f =>
        f.name === fileName || decodeURIComponent(f.name) === fileName || f.name === decodeURIComponent(fileName)
      );
      if (matchedFile) {
        const contentBase64 = await readContent(matchedFile);
        return success({
          content: contentBase64,
          mimeType: matchedFile.mimeType || 'application/octet-stream',
          name: matchedFile.name,
          size: Number(matchedFile.fileSize),
          path: filePath,
        });
      }
    }

    return error(ErrorCodes.NOT_FOUND, { message: '文件不存在' });
  },
});
