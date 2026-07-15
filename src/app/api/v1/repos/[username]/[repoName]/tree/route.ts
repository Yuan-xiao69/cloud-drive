export const dynamic = 'force-dynamic';
/**
 * v1 仓库文件树 API
 * GET /api/v1/repos/[username]/[repoName]/tree - 获取仓库文件树
 * DELETE /api/v1/repos/[username]/[repoName]/tree - 删除文件/文件夹
 * PATCH /api/v1/repos/[username]/[repoName]/tree - 重命名文件/文件夹
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { defineRoute } from '@/lib/framework/define-route';
import { success, error, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/lib/api/v1';
import { getUserRepoRole, canWrite } from '@/lib/auth/repo-permission';

// GET /api/v1/repos/[username]/[repoName]/tree
export const GET = defineRoute({
  auth: 'optional',
  handler: async ({ req, user, params }) => {
    const { username, repoName } = params;
    const { searchParams } = new URL(req.url);
    const branchParam = searchParams.get('branch');
    const parentId = searchParams.get('parentId') || null;
    const path = searchParams.get('path');

    const repo = await prisma.repository.findFirst({
      where: {
        owner: { username },
        name: repoName,
        deletedAt: null,
      },
      select: { id: true, ownerId: true, visibility: true, defaultBranch: true },
    });

    if (!repo) {
      return error(ErrorCodes.NOT_FOUND, { message: '仓库不存在' });
    }

    const branch = branchParam || repo.defaultBranch || 'main';

    if (repo.visibility === 0 && (!user || user.id !== repo.ownerId)) {
      return error(ErrorCodes.FORBIDDEN, { message: '私有仓库无法访问' });
    }

    const branchRecord = await prisma.branch.findFirst({
      where: {
        repoId: repo.id,
        name: branch,
      },
      select: { id: true, name: true },
    });

    if (!branchRecord) {
      return error(ErrorCodes.NOT_FOUND, { message: `分支 ${branch} 不存在` });
    }

    let targetParentId = parentId;
    if (path && path !== '/') {
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      const normalizedRepoName = repoName.startsWith('/') ? repoName : `/${repoName}`;
      const fullPath = `${normalizedRepoName}${normalizedPath}`;

      const folder = await prisma.repoItem.findFirst({
        where: {
          repoId: repo.id,
          branchId: branchRecord.id,
          path: fullPath,
          type: 'dir',
          isDeleted: false,
        },
        select: { id: true },
      });

      if (!folder) {
        return error(ErrorCodes.NOT_FOUND, { message: '路径不存在' });
      }
      targetParentId = folder.id;
    }

    const files = await prisma.repoItem.findMany({
      where: {
        repoId: repo.id,
        branchId: branchRecord.id,
        parentId: targetParentId,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        type: true,
        fileSize: true,
        mimeType: true,
        path: true,
        depth: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { type: 'asc' },
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    const items = files.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      size: f.fileSize.toString(),
      mimeType: f.mimeType ?? undefined,
      path: f.path,
      depth: f.depth,
      sortOrder: f.sortOrder,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    }));

    return success({
      branch: branchRecord.name,
      parentId: targetParentId,
      path: path || '/',
      items,
      total: items.length,
    });
  },
});

const deleteTreeSchema = z.object({
  path: z.string().min(1, '文件路径不能为空'),
  type: z.string().optional(),
  branch: z.string().optional(),
});

// DELETE /api/v1/repos/[username]/[repoName]/tree - 删除文件/文件夹
export const DELETE = defineRoute({
  auth: 'required',
  validation: deleteTreeSchema,
  handler: async ({ user, body, params }) => {
    const { username, repoName } = params;
    const { path: filePath, type, branch } = body as z.infer<typeof deleteTreeSchema>;

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
      return error(ErrorCodes.FORBIDDEN, { message: '无权删除文件' });
    }

    const branchRecord = branch
      ? await prisma.branch.findFirst({
          where: { repoId: repo.id, name: branch },
          select: { id: true },
        })
      : await prisma.branch.findFirst({
          where: { repoId: repo.id, isDefault: true },
          select: { id: true },
        });

    if (!branchRecord) {
      return error(ErrorCodes.NOT_FOUND, { message: '分支不存在' });
    }

    const item = await prisma.repoItem.findFirst({
      where: {
        repoId: repo.id,
        branchId: branchRecord.id,
        path: filePath.startsWith('/') ? filePath : `/${filePath}`,
        isDeleted: false,
      },
    });

    if (!item) {
      return error(ErrorCodes.NOT_FOUND, { message: '文件或文件夹不存在' });
    }

    await prisma.repoItem.update({
      where: { id: item.id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: user!.id,
      },
    });

    if (item.type === 'dir') {
      const prefix = item.path ? `${item.path}/` : `/${item.name}/`;
      await prisma.repoItem.updateMany({
        where: {
          repoId: repo.id,
          branchId: branchRecord.id,
          path: { startsWith: prefix },
          isDeleted: false,
          NOT: { path: null },
        },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: user!.id,
        },
      });
    }

    return success({ id: item.id, name: item.name }, '删除成功');
  },
});

const renameSchema = z.object({
  sourcePath: z.string().min(1, '源路径不能为空'),
  targetName: z.string().min(1, '目标名称不能为空'),
  branch: z.string().optional(),
});

// PATCH /api/v1/repos/[username]/[repoName]/tree - 重命名文件/文件夹
export const PATCH = defineRoute({
  auth: 'required',
  validation: renameSchema,
  handler: async ({ user, body, params }) => {
    const { username, repoName } = params;
    const { sourcePath, targetName, branch } = body as z.infer<typeof renameSchema>;

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
      return error(ErrorCodes.FORBIDDEN, { message: '无权重命名文件' });
    }

    const branchRecord = branch
      ? await prisma.branch.findFirst({
          where: { repoId: repo.id, name: branch },
          select: { id: true },
        })
      : await prisma.branch.findFirst({
          where: { repoId: repo.id, isDefault: true },
          select: { id: true },
        });

    if (!branchRecord) {
      return error(ErrorCodes.NOT_FOUND, { message: '分支不存在' });
    }

    const normalizedPath = sourcePath.startsWith('/') ? sourcePath : `/${sourcePath}`;
    const item = await prisma.repoItem.findFirst({
      where: {
        repoId: repo.id,
        branchId: branchRecord.id,
        path: normalizedPath,
        isDeleted: false,
      },
    });

    if (!item) {
      return error(ErrorCodes.NOT_FOUND, { message: '文件或文件夹不存在' });
    }

    const parentPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'));
    const newPath = parentPath ? `${parentPath}/${targetName}` : `/${targetName}`;

    const existing = await prisma.repoItem.findFirst({
      where: {
        repoId: repo.id,
        branchId: branchRecord.id,
        path: newPath,
        isDeleted: false,
        id: { not: item.id },
      },
    });

    if (existing) {
      return errors.conflict('目标名称已存在');
    }

    await prisma.repoItem.update({
      where: { id: item.id },
      data: {
        name: targetName,
        path: newPath,
      },
    });

    if (item.type === 'dir') {
      const children = await prisma.repoItem.findMany({
        where: {
          repoId: repo.id,
          branchId: branchRecord.id,
          path: { startsWith: `${normalizedPath}/` },
          isDeleted: false,
        },
        select: { id: true, path: true },
      });

      if (children.length > 0) {
        await prisma.$transaction(
          children.map((child) => {
            const updatedChildPath = child.path ? child.path.replace(normalizedPath, newPath) : child.path;
            return prisma.repoItem.update({
              where: { id: child.id },
              data: { path: updatedChildPath },
            });
          })
        );
      }
    }

    return success({ id: item.id, name: targetName, path: newPath }, '重命名成功');
  },
});
