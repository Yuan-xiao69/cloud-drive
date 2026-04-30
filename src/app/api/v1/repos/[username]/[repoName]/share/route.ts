export const dynamic = 'force-dynamic';
/**
 * v1 仓库分享链接 API
 * GET /api/v1/repos/[username]/[repoName]/share - 获取分享链接列表
 * POST /api/v1/repos/[username]/[repoName]/share - 创建分享链接
 */

import { NextRequest } from 'next/server';
import { success, created, paginated, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';
import { parsePagination, buildPaginationMeta } from '@/lib/api/v1/pagination';
import { randomBytes } from 'crypto';

// 生成随机 token
function generateToken(): string {
  return randomBytes(32).toString('hex');
}

// GET /api/v1/repos/[username]/[repoName]/share - 获取分享链接列表
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

    // 解析分页参数
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 100);
    const skip = (page - 1) * pageSize;

    // 查找仓库
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

    // 只有仓库所有者可以查看分享链接列表
    if (repo.ownerId !== auth.userId) {
      return errors.forbidden('只有仓库所有者可以查看分享链接列表');
    }

    // 查询分享链接
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
  } catch (err) {
    return handlePrismaError(err, '获取分享链接列表失败');
  }
}

// POST /api/v1/repos/[username]/[repoName]/share - 创建分享链接
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
    const { path, permission, password, expiresIn, maxViews } = body;

    // 查找仓库
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

    // 只有仓库所有者可以创建分享链接
    if (repo.ownerId !== auth.userId) {
      return errors.forbidden('只有仓库所有者可以创建分享链接');
    }

    // 验证权限
    const validPermissions = ['read', 'download'];
    const sharePermission = permission || 'read';
    if (!validPermissions.includes(sharePermission)) {
      return errors.badRequest(`permission 必须是: ${validPermissions.join(', ')}`);
    }

    // 验证过期时间
    let expiresAt: Date | null = null;
    if (expiresIn) {
      const hours = parseInt(expiresIn, 10);
      if (isNaN(hours) || hours < 1 || hours > 8760) { // 最多 1 年
        return errors.badRequest('expiresIn 必须是 1-8760 之间的小时数');
      }
      expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    }

    // 验证最大浏览次数
    let shareMaxViews: number | null = null;
    if (maxViews) {
      shareMaxViews = parseInt(maxViews, 10);
      if (isNaN(shareMaxViews) || shareMaxViews < 1) {
        return errors.badRequest('maxViews 必须是正整数');
      }
    }

    // 生成 token
    const token = generateToken();

    // 创建分享链接
    const shareLink = await prisma.shareLink.create({
      data: {
        token,
        repoId: repo.id,
        creatorId: auth.userId,
        path: path || null,
        permission: sharePermission,
        password: password || null,
        expiresAt,
        maxViews: shareMaxViews,
        viewCount: 0,
        isActive: true,
      },
      include: {
        creator: { select: { id: true, username: true } },
      },
    });

    return created({
      id: shareLink.id,
      token: shareLink.token,
      repoId: shareLink.repoId,
      path: shareLink.path,
      permission: shareLink.permission,
      hasPassword: !!shareLink.password,
      expiresAt: shareLink.expiresAt?.toISOString() ?? null,
      maxViews: shareLink.maxViews,
      viewCount: shareLink.viewCount,
      shareUrl: `/share/${shareLink.token}`,
      createdAt: shareLink.createdAt.toISOString(),
    }, '分享链接创建成功');
  } catch (err) {
    return handlePrismaError(err, '创建分享链接失败');
  }
}
