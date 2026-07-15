export const dynamic = 'force-dynamic';
/**
 * v1 仓库文件上传 API
 * POST /api/v1/repos/[username]/[repoName]/upload - 上传文件（单文件）
 *
 * 安全验证由 lib/upload-pipeline.ts 统一处理。
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { defineRoute } from '@/lib/framework/define-route';
import { created, error, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/lib/api/v1';
import { validateUploadFromBase64 } from '@/lib/upload-pipeline';
import { putFile, repoFileKey } from '@/lib/storage';
import { checkRepoAccess } from '@/lib/auth/access';

const uploadSchema = z.object({
  name: z.string().min(1, '文件名称不能为空'),
  content: z.string().optional(),
  size: z.number().optional(),
  mimeType: z.string().optional(),
  parentId: z.string().optional(),
  branch: z.string().min(1, '分支名称不能为空'),
  path: z.string().optional(),
  isDirectory: z.boolean().optional(),
  type: z.string().optional(),
});

// POST /api/v1/repos/[username]/[repoName]/upload
export const POST = defineRoute({
  auth: 'required',
  validation: uploadSchema,
  handler: async ({ req, user, body, params }) => {
    const { username, repoName } = params;
    const { name, content, size, mimeType, parentId, branch, path: filePath, isDirectory, type } = body as z.infer<typeof uploadSchema>;

    const access = await checkRepoAccess(req, { username, repoName }, 'write');
    if (!access.allowed) return access.error;

    const repo = access.repo;

    // 路径穿越防护：禁止 .. 和绝对路径
    if (filePath && (filePath.includes('..') || filePath.startsWith('/'))) {
      return error(ErrorCodes.VALIDATION_ERROR, { message: '文件路径包含非法字符' });
    }
    if (name && (name.includes('..') || name.includes('/') || name.includes('\\'))) {
      return error(ErrorCodes.VALIDATION_ERROR, { message: '文件名包含非法字符' });
    }

    if (!name) {
      return errors.badRequest('文件名称不能为空');
    }

    if (!branch) {
      return errors.badRequest('分支名称不能为空');
    }

    // ========== 文件安全验证（统一安全门） ==========
    const isDir = isDirectory === true || type === 'dir';

    if (!isDir && size != null) {
      if (content) {
        const result = await validateUploadFromBase64(content, name, {
          userId: access.userId,
          repoId: repo.id,
        });

        if (!result.safe) {
          return error(ErrorCodes.INVALID_FILE_TYPE, { message: result.reason! });
        }
      } else {
        const fileSize = Number(size) || 0;
        if (fileSize > 100 * 1024 * 1024) {
          return error(ErrorCodes.FILE_TOO_LARGE, { message: '文件大小不能超过 100MB' });
        }
      }
    }

    // 查找分支
    const branchRecord = await prisma.branch.findFirst({
      where: { repoId: repo.id, name: branch },
      select: { id: true, name: true },
    });

    if (!branchRecord) {
      return error(ErrorCodes.NOT_FOUND, { message: `分支 ${branch} 不存在` });
    }

    // 构造完整路径
    const fullPath = filePath || `/${name}`;
    const depth = (fullPath.match(/\//g) || []).length - 1;

    // 检查文件/文件夹是否已存在
    const existing = await prisma.repoItem.findFirst({
      where: {
        repoId: repo.id,
        branchId: branchRecord.id,
        name,
        path: fullPath,
        isDeleted: false,
      },
    });

    if (existing) {
      return errors.conflict('文件已存在，请使用更新接口或先删除');
    }

    // 先创建 DB 记录获取 ID（MinIO key 需要 file.id）
    const file = await prisma.repoItem.create({
      data: {
        repoId: repo.id,
        branchId: branchRecord.id,
        parentId: parentId || null,
        name,
        type: isDir ? 'dir' : 'file',
        fileSize: isDir ? BigInt(0) : BigInt(size || 0),
        mimeType: mimeType || (isDir ? null : 'application/octet-stream'),
        depth,
        path: fullPath,
      },
    });

    // 上传到 MinIO，失败则回滚 DB 记录
    if (!isDir && content) {
      try {
        const key = repoFileKey(repo.id, branchRecord.id, file.id);
        await putFile(key, content, mimeType || 'application/octet-stream');
        await prisma.repoItem.update({
          where: { id: file.id },
          data: { storagePath: key },
        });
      } catch (uploadErr) {
        await prisma.repoItem.delete({ where: { id: file.id } });
        throw uploadErr;
      }
    }

    return created({
      id: file.id,
      name: file.name,
      type: file.type,
      size: file.fileSize.toString(),
      path: file.path,
      createdAt: file.createdAt.toISOString(),
    }, isDir ? '文件夹创建成功' : '文件上传成功');
  },
});
