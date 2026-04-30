export const dynamic = 'force-dynamic';
/**
 * v1 公告详情 API
 * GET /api/v1/admin/announcements/[id] - 获取单个公告
 * PATCH /api/v1/admin/announcements/[id] - 更新公告
 * DELETE /api/v1/admin/announcements/[id] - 删除公告
 */

import { NextRequest } from 'next/server';
import { success, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isAuthError } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';

// GET /api/v1/admin/announcements/[id] - 获取单个公告
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;

    const announcement = await prisma.announcement.findUnique({
      where: { id },
    });

    if (!announcement) {
      return error(ErrorCodes.NOT_FOUND, { message: '公告不存在' });
    }

    // 获取创建者信息
    const creator = await prisma.user.findUnique({
      where: { id: announcement.createdBy },
      select: { id: true, username: true, avatarUrl: true },
    });

    return success({
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      priority: announcement.priority,
      isPinned: announcement.isPinned,
      isActive: announcement.isActive,
      publishedAt: announcement.publishedAt?.toISOString() ?? null,
      expiresAt: announcement.expiresAt?.toISOString() ?? null,
      createdAt: announcement.createdAt.toISOString(),
      updatedAt: announcement.updatedAt.toISOString(),
      createdBy: announcement.createdBy,
      creator: creator ? { id: creator.id, username: creator.username, avatarUrl: creator.avatarUrl } : null,
    });
  } catch (err) {
    return handlePrismaError(err, '获取公告失败');
  }
}

// PATCH /api/v1/admin/announcements/[id] - 更新公告
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const { id } = await params;
    const body = await req.json();
    const { title, content, type, priority, isPinned, isActive, publishedAt, expiresAt } = body;

    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) {
      return error(ErrorCodes.NOT_FOUND, { message: '公告不存在' });
    }

    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(type !== undefined && { type }),
        ...(priority !== undefined && { priority }),
        ...(isPinned !== undefined && { isPinned }),
        ...(isActive !== undefined && { isActive }),
        ...(publishedAt !== undefined && { publishedAt: publishedAt ? new Date(publishedAt) : null }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
      },
    });

    return success(announcement, '公告更新成功');
  } catch (err) {
    return handlePrismaError(err, '更新公告失败');
  }
}

// DELETE /api/v1/admin/announcements/[id] - 删除公告
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const { id } = await params;

    const existing = await prisma.announcement.findUnique({ where: { id } });
    if (!existing) {
      return error(ErrorCodes.NOT_FOUND, { message: '公告不存在' });
    }

    await prisma.announcement.delete({ where: { id } });

    return success({ id }, '公告已删除');
  } catch (err) {
    return handlePrismaError(err, '删除公告失败');
  }
}
