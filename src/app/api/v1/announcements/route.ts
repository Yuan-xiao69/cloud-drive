export const dynamic = 'force-dynamic';
/**
 * v1 公告 API
 * GET /api/v1/announcements - 获取活跃公告（所有登录用户可见）
 * POST /api/v1/announcements - 创建公告（仅管理员）
 * GET /api/v1/announcements/[id] - 获取单个公告
 * PATCH /api/v1/announcements/[id] - 更新公告（仅管理员）
 * DELETE /api/v1/announcements/[id] - 删除公告（仅管理员）
 */

import { NextRequest } from 'next/server';
import { success, error, paginated, handlePrismaError, parsePagination } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isAuthError } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';

// GET /api/v1/announcements - 获取活跃公告
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const now = new Date();

    // 获取所有活跃且未过期的公告
    const announcements = await prisma.announcement.findMany({
      where: {
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      orderBy: [
        { isPinned: 'desc' },
        { priority: 'desc' },
        { publishedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 10,
      select: {
        id: true,
        title: true,
        content: true,
        type: true,
        priority: true,
        isPinned: true,
        publishedAt: true,
        expiresAt: true,
      },
    });

    return success({
      announcements,
      count: announcements.length,
    });
  } catch (err) {
    return handlePrismaError(err, '获取公告失败');
  }
}

// POST /api/v1/announcements - 创建公告（仅管理员）
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const body = await req.json();
    const { title, content, type, priority, isPinned, publishedAt, expiresAt } = body;

    if (!title || !content) {
      return error(ErrorCodes.VALIDATION_ERROR, { message: '标题和内容不能为空' });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        type: type || 'info',
        priority: priority || 'normal',
        isPinned: isPinned || false,
        publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: auth.userId,
      },
    });

    return success(announcement, '公告创建成功');
  } catch (err) {
    return handlePrismaError(err, '创建公告失败');
  }
}
