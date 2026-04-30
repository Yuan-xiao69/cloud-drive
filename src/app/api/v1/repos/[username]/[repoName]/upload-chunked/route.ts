export const dynamic = 'force-dynamic';
/**
 * v1 仓库分片上传 API
 * POST /api/v1/repos/[username]/[repoName]/upload-chunked - 分片上传
 *   action=init    - 初始化上传
 *   action=chunk   - 上传分片
 *   action=complete- 完成上传
 *   action=cancel   - 取消上传
 * GET  /api/v1/repos/[username]/[repoName]/upload-chunked - 获取上传状态
 */

import { NextRequest } from 'next/server';
import { success, created, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';

// POST /api/v1/repos/[username]/[repoName]/upload-chunked
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
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

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

    if (repo.ownerId !== auth.userId) {
      return error(ErrorCodes.FORBIDDEN, { message: '只有仓库所有者可以上传文件' });
    }

    // action=init: 初始化上传
    if (action === 'init') {
      const body = await req.json();
      const { fileName, fileSize, chunkSize, totalChunks, mimeType, branch, fileHash, path: filePath } = body;

      if (!fileName || !fileSize || !totalChunks) {
        return errors.badRequest('缺少必要参数: fileName, fileSize, totalChunks');
      }

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

      // 生成上传ID
      const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

      // 查找或创建文件记录
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
        return errors.conflict('文件已存在');
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

      // 创建临时分片记录
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1小时后过期
      for (let i = 0; i < Number(totalChunks); i++) {
        await prisma.repoFileChunk.create({
          data: {
            repoId: repo.id,
            branchId: branchRecord.id,
            uploadId,
            chunkIndex: i,
            chunkSize: i === Number(totalChunks) - 1
              ? Number(fileSize) - i * Number(chunkSize)
              : Number(chunkSize),
            totalChunks: Number(totalChunks),
            fileName,
            parentPath: filePath ? filePath.substring(0, filePath.lastIndexOf('/')) : '',
            totalSize: BigInt(Number(fileSize)),
            mimeType: mimeType || 'application/octet-stream',
            userId: auth.userId,
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
        chunkSize: Number(chunkSize),
        branch: branchRecord.name,
      }, '上传已初始化');
    }

    // action=chunk: 上传分片
    if (action === 'chunk') {
      const body = await req.json();
      const { uploadId, chunkIndex, chunkData, chunkHash } = body;

      if (!uploadId || chunkIndex === undefined) {
        return errors.badRequest('缺少参数: uploadId, chunkIndex');
      }

      // 查找分片记录
      const chunk = await prisma.repoFileChunk.findFirst({
        where: { uploadId, chunkIndex },
      });

      if (!chunk) {
        return error(ErrorCodes.NOT_FOUND, { message: '分片不存在或上传已过期' });
      }

      // 更新分片状态
      await prisma.repoFileChunk.update({
        where: { id: chunk.id },
        data: {
          status: 'completed',
          chunkHash: chunkHash || '',
          chunkData: chunkData || '',
        },
      });

      // 检查是否所有分片都上传完成
      const pendingChunks = await prisma.repoFileChunk.count({
        where: { uploadId, status: 'pending' },
      });

      return success({
        chunkIndex,
        uploaded: true,
        pendingChunks,
        completed: pendingChunks === 0,
      });
    }

    // action=complete: 完成上传
    if (action === 'complete') {
      const body = await req.json();
      const { uploadId } = body;

      if (!uploadId) {
        return errors.badRequest('缺少参数: uploadId');
      }

      // 查找文件记录（通过任意一个分片）
      const firstChunk = await prisma.repoFileChunk.findFirst({
        where: { uploadId },
        select: {
          repoId: true,
          branchId: true,
          fileName: true,
          totalSize: true,
          mimeType: true,
          parentPath: true,
        },
      });

      if (!firstChunk) {
        return error(ErrorCodes.NOT_FOUND, { message: '上传会话不存在' });
      }

      // 查找文件记录
      const fileRecord = await prisma.repoItem.findFirst({
        where: {
          repoId: firstChunk.repoId,
          name: firstChunk.fileName,
          isDeleted: false,
        },
      });

      if (!fileRecord) {
        return error(ErrorCodes.NOT_FOUND, { message: '文件不存在' });
      }

      // 检查所有分片
      const pendingChunks = await prisma.repoFileChunk.count({
        where: { uploadId, status: 'pending' },
      });

      if (pendingChunks > 0) {
        return errors.badRequest(`还有 ${pendingChunks} 个分片未上传`);
      }

      // 获取所有分片数据并合并
      const allChunks = await prisma.repoFileChunk.findMany({
        where: { uploadId },
        orderBy: { chunkIndex: 'asc' },
        select: { chunkData: true },
      });

      // 合并分片数据（假设每个 chunkData 是 base64 编码）
      let combinedContent = '';
      for (const chunk of allChunks) {
        if (chunk.chunkData) {
          // 如果是 base64 数据，直接拼接
          combinedContent += chunk.chunkData;
        }
      }

      // 将合并后的内容保存到文件记录
      await prisma.repoItem.update({
        where: { id: fileRecord.id },
        data: {
          content: combinedContent,
        },
      });

      // 清理分片记录
      await prisma.repoFileChunk.deleteMany({ where: { uploadId } });

      return success({
        id: fileRecord.id,
        name: fileRecord.name,
        size: fileRecord.fileSize.toString(),
        path: fileRecord.path,
      }, '文件上传完成');
    }

    // action=cancel: 取消上传
    if (action === 'cancel') {
      const body = await req.json();
      const { uploadId } = body;

      if (!uploadId) {
        return errors.badRequest('缺少参数: uploadId');
      }

      // 查找文件ID
      const firstChunk = await prisma.repoFileChunk.findFirst({
        where: { uploadId },
        select: {
          repoId: true,
          branchId: true,
          fileName: true,
        },
      });

      if (firstChunk) {
        // 删除文件记录
        await prisma.repoItem.deleteMany({
          where: {
            repoId: firstChunk.repoId,
            name: firstChunk.fileName,
            isDeleted: false,
          },
        });
      }

      // 清理分片记录
      await prisma.repoFileChunk.deleteMany({ where: { uploadId } });

      return success({ uploadId }, '上传已取消');
    }

    return errors.badRequest('未知的 action，支持: init, chunk, complete, cancel');
  } catch (err) {
    return handlePrismaError(err, '分片上传失败');
  }
}

// GET /api/v1/repos/[username]/[repoName]/upload-chunked - 获取上传状态
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
    const uploadId = searchParams.get('uploadId');

    if (!uploadId) {
      return errors.badRequest('缺少参数: uploadId');
    }

    const chunks = await prisma.repoFileChunk.findMany({
      where: { uploadId },
      orderBy: { chunkIndex: 'asc' },
    });

    const uploaded = chunks.filter((c) => c.status === 'completed').length;
    return success({
      uploadId,
      totalChunks: chunks.length,
      uploadedChunks: uploaded,
      completed: uploaded === chunks.length && chunks.length > 0,
      chunks: chunks.map((c) => ({
        index: c.chunkIndex,
        uploaded: c.status === 'completed',
      })),
    });
  } catch (err) {
    return handlePrismaError(err, '获取上传状态失败');
  }
}
