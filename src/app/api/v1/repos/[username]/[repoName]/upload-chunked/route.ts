export const dynamic = 'force-dynamic';
/**
 * v1 仓库分片上传 API
 * POST /api/v1/repos/[username]/[repoName]/upload-chunked - 分片上传
 *   action=init    - 初始化上传
 *   action=chunk   - 上传分片
 *   action=complete- 完成上传
 *   action=cancel   - 取消上传
 * GET  /api/v1/repos/[username]/[repoName]/upload-chunked - 获取上传状态
 *
 * 安全验证由 lib/upload-pipeline.ts 统一处理。
 */

import { NextRequest } from 'next/server';
import { defineRoute } from '@/lib/framework/define-route';
import { success, created, error, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/lib/api/v1';
import { validateUpload } from '@/lib/upload-pipeline';
import { checkRepoAccess } from '@/lib/auth/access';
import { UploadService } from '@/services/upload-service';

const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

// POST /api/v1/repos/[username]/[repoName]/upload-chunked
export const POST = defineRoute({
  auth: 'required',
  handler: async ({ req, user, params }) => {
    const { username, repoName } = params;
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    const access = await checkRepoAccess(req, { username, repoName }, 'write');
    if (!access.allowed) return access.error;

    const repo = access.repo;

    // action=init: 初始化上传
    if (action === 'init') {
      const body = await req.json();
      const { fileName, fileSize, chunkSize, totalChunks, mimeType, branch, fileHash, path: filePath } = body;

      if (!fileName || !fileSize || !totalChunks) {
        return errors.badRequest('缺少必要参数: fileName, fileSize, totalChunks');
      }

      // ========== 文件安全验证（统一安全门） ==========
      const validationResult = await validateUpload(
        {
          name: fileName,
          size: Number(fileSize),
          type: mimeType || '',
          arrayBuffer: async () => new ArrayBuffer(0),
        },
        { userId: access.userId, repoId: repo.id }
      );

      if (!validationResult.safe) {
        return error(ErrorCodes.INVALID_FILE_TYPE, { message: validationResult.reason! });
      }

      // 路径穿越防护
      if (filePath && (filePath.includes('..') || filePath.startsWith('/'))) {
        return error(ErrorCodes.VALIDATION_ERROR, { message: '文件路径包含非法字符' });
      }

      const chunkSizeNum = Number(chunkSize) || DEFAULT_CHUNK_SIZE;

      if (!branch) {
        return errors.badRequest('分支名称不能为空');
      }

      const branchRecord = await prisma.branch.findFirst({
        where: { repoId: repo.id, name: branch },
        select: { id: true, name: true },
      });

      if (!branchRecord) {
        return error(ErrorCodes.NOT_FOUND, { message: `分支 ${branch} 不存在` });
      }

      const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

      const fullPath = filePath || `/${fileName}`;
      let fileRecord = await prisma.repoItem.findFirst({
        where: {
          repoId: repo.id,
          branchId: branchRecord.id,
          name: fileName,
          path: fullPath,
          isDeleted: false,
        },
      });

      if (fileRecord) {
        if (fileHash && fileRecord.hash === fileHash) {
          return success({
            skipped: true,
            existingFile: {
              id: fileRecord.id,
              name: fileRecord.name,
              fileSize: Number(fileRecord.fileSize),
              mimeType: fileRecord.mimeType,
              path: fileRecord.path,
            },
          });
        }
        return error(ErrorCodes.FILE_EXISTS,
          { message: '文件已存在但内容不同，请重命名或删除旧文件后重试' });
      }

      fileRecord = await prisma.repoItem.create({
        data: {
          repoId: repo.id,
          branchId: branchRecord.id,
          name: fileName,
          type: 'file',
          fileSize: BigInt(Number(fileSize)),
          mimeType: mimeType || 'application/octet-stream',
          hash: fileHash || null,
          depth: (fullPath.match(/\//g) || []).length - 1,
          path: fullPath,
        },
      });

      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      for (let i = 0; i < Number(totalChunks); i++) {
        await prisma.repoFileChunk.create({
          data: {
            repoId: repo.id,
            branchId: branchRecord.id,
            uploadId,
            chunkIndex: i,
            chunkSize: i === Number(totalChunks) - 1
              ? Number(fileSize) - i * chunkSizeNum
              : chunkSizeNum,
            totalChunks: Number(totalChunks),
            fileName,
            parentPath: filePath ? filePath.substring(0, filePath.lastIndexOf('/')) : '',
            totalSize: BigInt(Number(fileSize)),
            mimeType: mimeType || 'application/octet-stream',
            userId: access.userId,
            status: 'pending',
            expiresAt,
            chunkHash: '',
            chunkData: '',
          },
        });
      }

      return created({
        uploadId,
        fileId: fileRecord.id,
        fileName,
        totalChunks: Number(totalChunks),
        chunkSize: chunkSizeNum,
        branch: branchRecord.name,
      }, '上传已初始化');
    }

    // action=chunk: 上传分片（接收原始二进制数据）
    if (action === 'chunk') {
      const uploadId = searchParams.get('uploadId');
      const chunkIndexStr = searchParams.get('chunkIndex');
      const chunkHash = searchParams.get('chunkHash') || undefined;

      if (!uploadId || chunkIndexStr === null) {
        return errors.badRequest('缺少参数: uploadId, chunkIndex（通过查询参数传递）');
      }

      const chunkIndex = parseInt(chunkIndexStr, 10);
      if (isNaN(chunkIndex)) {
        return errors.badRequest('chunkIndex 必须为整数');
      }

      const chunkData = Buffer.from(await req.arrayBuffer());

      try {
        const result = await UploadService.uploadChunk(uploadId, chunkIndex, chunkData, chunkHash);
        return success(result);
      } catch (err) {
        return error(ErrorCodes.NOT_FOUND, { message: (err as Error).message });
      }
    }

    // action=complete: 完成上传
    if (action === 'complete') {
      const body = await req.json();
      const { uploadId } = body;

      if (!uploadId) {
        return errors.badRequest('缺少参数: uploadId');
      }

      try {
        const result = await UploadService.completeUpload(uploadId);
        return success(result, '文件上传完成');
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.includes('分片未上传')) {
          return errors.badRequest(msg);
        }
        return error(ErrorCodes.NOT_FOUND, { message: msg });
      }
    }

    // action=cancel: 取消上传
    if (action === 'cancel') {
      const body = await req.json();
      const { uploadId } = body;

      if (!uploadId) {
        return errors.badRequest('缺少参数: uploadId');
      }

      await UploadService.cancelUpload(uploadId);
      return success({ uploadId }, '上传已取消');
    }

    return errors.badRequest('未知的 action，支持: init, chunk, complete, cancel');
  },
});

// GET /api/v1/repos/[username]/[repoName]/upload-chunked - 获取上传状态
export const GET = defineRoute({
  auth: 'required',
  handler: async ({ req, params }) => {
    const { username, repoName } = params;

    const access = await checkRepoAccess(req, { username, repoName }, 'read');
    if (!access.allowed) return access.error;

    const { searchParams } = new URL(req.url);
    const uploadId = searchParams.get('uploadId');

    if (!uploadId) {
      return errors.badRequest('缺少参数: uploadId');
    }

    const status = await UploadService.getUploadStatus(uploadId);
    return success(status);
  },
});
