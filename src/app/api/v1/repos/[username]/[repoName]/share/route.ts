export const dynamic = 'force-dynamic';
/**
 * v1 仓库分享链接 API
 * GET /api/v1/repos/[username]/[repoName]/share - 获取分享链接列表
 * POST /api/v1/repos/[username]/[repoName]/share - 创建分享链接
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { defineRoute } from '@/lib/framework/define-route';
import { success, created, paginated, error, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { ErrorCodes } from '@/lib/api/v1';
import { parsePagination, buildPaginationMeta } from '@/lib/api/v1/pagination';
import { getUserRepoRole, canManageRepo } from '@/lib/auth/repo-permission';
import { ShareService } from '@/services/share-service';

// GET /api/v1/repos/[username]/[repoName]/share - 获取分享链接列表
export const GET = defineRoute({
  auth: 'required',
  handler: async ({ req, user, params }) => {
    const { username, repoName } = params;
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 100);
    const skip = (page - 1) * pageSize;

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
    if (!canManageRepo(userRole)) {
      return errors.forbidden('无权查看分享链接列表');
    }

    const [links, total] = await Promise.all([
      prisma.shareLink.findMany({
        where: {
          repoId: repo.id,
          isActive: true,
        },
        include: {
          creator: { select: { id: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.shareLink.count({ where: { repoId: repo.id, isActive: true } }),
    ]);

    const items = links.map((link) => ({
      id: link.id,
      token: link.token,
      repoId: link.repoId,
      creator: {
        id: link.creator.id,
        username: link.creator.username,
      },
      path: link.path,
      permission: link.permission,
      hasPassword: !!link.password,
      expiresAt: link.expiresAt?.toISOString() ?? null,
      maxViews: link.maxViews,
      viewCount: link.viewCount,
      isActive: link.isActive,
      createdAt: link.createdAt.toISOString(),
    }));

    return paginated(items, buildPaginationMeta(total, page, pageSize));
  },
});

const createShareSchema = z.object({
  path: z.string().optional(),
  permission: z.string().optional(),
  password: z.string().optional(),
  expiresIn: z.union([z.string(), z.number()]).optional(),
  maxViews: z.union([z.string(), z.number()]).optional(),
});

// POST /api/v1/repos/[username]/[repoName]/share - 创建分享链接
export const POST = defineRoute({
  auth: 'required',
  validation: createShareSchema,
  handler: async ({ user, body, params }) => {
    const { username, repoName } = params;
    const { path, permission, password, expiresIn, maxViews } = body as z.infer<typeof createShareSchema>;

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
    if (!canManageRepo(userRole)) {
      return errors.forbidden('无权创建分享链接');
    }

    const validPermissions = ['read', 'download'];
    const sharePermission = permission || 'read';
    if (!validPermissions.includes(sharePermission)) {
      return errors.badRequest(`permission 必须是: ${validPermissions.join(', ')}`);
    }

    let expiresAt: Date | null = null;
    if (expiresIn) {
      const hours = parseInt(String(expiresIn), 10);
      if (isNaN(hours) || hours < 1 || hours > 8760) {
        return errors.badRequest('expiresIn 必须是 1-8760 之间的小时数');
      }
      expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    }

    if (path) {
      const exists = await prisma.repoItem.findFirst({
        where: { repoId: repo.id, path, isDeleted: false }
      });
      if (!exists) return error(ErrorCodes.NOT_FOUND, { message: '分享目标不存在' });
    }

    let shareMaxViews: number | null = null;
    if (maxViews) {
      shareMaxViews = parseInt(String(maxViews), 10);
      if (isNaN(shareMaxViews) || shareMaxViews < 1) {
        return errors.badRequest('maxViews 必须是正整数');
      }
    }

    const shareLink = await ShareService.create({
      repoId: repo.id,
      creatorId: user!.id,
      path: path || null,
      permission: sharePermission,
      password: password || null,
      expiresAt,
      maxViews: shareMaxViews,
    });

    return created({
      ...shareLink,
      shareUrl: `/share/${shareLink.token}`,
    }, '分享链接创建成功');
  },
});
