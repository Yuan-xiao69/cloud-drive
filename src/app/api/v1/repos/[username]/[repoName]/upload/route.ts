export const dynamic = 'force-dynamic';
/**
 * v1 仓库文件上传 API
 * POST /api/v1/repos/[username]/[repoName]/upload - 上传文件（单文件）
 */

import { NextRequest } from 'next/server';
import { success, created, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';

// POST /api/v1/repos/[username]/[repoName]/upload
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

    // 只有仓库所有者可以上传
    if (repo.ownerId !== auth.userId) {
      return error(ErrorCodes.FORBIDDEN, { message: '只有仓库所有者可以上传文件' });
    }

    const body = await req.json();
    const { name, content, size, mimeType, parentId, branch, path: filePath, isDirectory, type } = body;

    if (!name) {
      return errors.badRequest('文件名称不能为空');
    }

    if (!branch) {
      return errors.badRequest('分支名称不能为空');
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
    
    // 判断是否为目录
    const isDir = isDirectory === true || type === 'dir';

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

    const file = await prisma.repoItem.create({
      data: {
        repoId: repo.id,
        branchId: branchRecord.id,
        parentId: parentId || null,
        name,
        type: isDir ? 'dir' : 'file',
        fileSize: isDir ? BigInt(0) : BigInt(size || 0),
        mimeType: mimeType || (isDir ? null : 'application/octet-stream'),
        content: isDir ? null : (content || null),
        depth,
        path: fullPath,
      },
    });

    return created({
      id: file.id,
      name: file.name,
      type: file.type,
      size: file.fileSize.toString(),
      path: file.path,
      createdAt: file.createdAt.toISOString(),
    }, isDir ? '文件夹创建成功' : '文件上传成功');
  } catch (err) {
    return handlePrismaError(err, '上传文件失败');
  }
}
