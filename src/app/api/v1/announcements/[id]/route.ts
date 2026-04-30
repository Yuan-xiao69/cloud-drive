export const dynamic = 'force-dynamic';
/**
 * v1 单条公告 API
 * GET    /api/v1/announcements/[id] - 获取单条公告（登录用户或管理员）
 * PATCH  /api/v1/announcements/[id] - 更新公告（仅管理员）
 * DELETE /api/v1/announcements/[id] - 删除公告（仅管理员）
 */

import { NextRequest } from 'next/server';
import { success, error, handlePrismaError } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { requireAdmin, getAuthUser, isAuthError } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';

// GET /api/v1/announcements/[id] - 获取单条公告
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;

    if (!id) {
      return error(ErrorCodes.VALIDATION_ERROR, { message: '公告 ID 不能为空' });
    }

    const user = await getAuthUser(req);

    // 管理员可查看任意状态公告，普通用户只能查看活跃公告
    const isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');

    const announcement = await prisma.announcement.findUnique({
      where: { id },
    });

    if (!announcement) {
      return error(ErrorCodes.NOT_FOUND, { message: '公告不存在' });
    }

    // 非管理员只能查看活跃且未过期公告
    if (!isAdmin) {
      const now = new Date();
      const isExpired = announcement.expiresAt && announcement.expiresAt < now;
      if (!announcement.isActive || isExpired) {
        return error(ErrorCodes.NOT_FOUND, { message: '公告不存在' });
      }
    }

    return success(announcement);
  } catch (err) {
    return handlePrismaError(err, '获取公告失败');
  }
}

// PATCH /api/v1/announcements/[id] - 更新公告（仅管理员）
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

    if (!id) {
      return error(ErrorCodes.VALIDATION_ERROR, { message: '公告 ID 不能为空' });
    }

    // 检查公告是否存在
    const existing = await prisma.announcement.findUnique({
      where: { id },
    });

    if (!existing) {
      return error(ErrorCodes.NOT_FOUND, { message: '公告不存在' });
    }

    const body = await req.json();
    const { title, content, type, priority, isActive, isPinned, publishedAt, expiresAt } = body;

    // 构建更新数据（只更新传入的字段）
    const updateData: {
      title?: string;
      content?: string;
      type?: string;
      priority?: string;
      isActive?: boolean;
      isPinned?: boolean;
      publishedAt?: Date | null;
      expiresAt?: Date | null;
    } = {};

    if (title !== undefined) {
      if (!title || typeof title !== 'string' || title.trim() === '') {
        return error(ErrorCodes.VALIDATION_ERROR, { message: '标题不能为空' });
      }
      updateData.title = title.trim();
    }

    if (content !== undefined) {
      if (!content || typeof content !== 'string' || content.trim() === '') {
        return error(ErrorCodes.VALIDATION_ERROR, { message: '内容不能为空' });
      }
      updateData.content = content;
    }

    if (type !== undefined) {
      const validTypes = ['info', 'warning', 'critical', 'success'];
      if (!validTypes.includes(type)) {
        return error(ErrorCodes.VALIDATION_ERROR, { message: `type 必须是 ${validTypes.join('/')} 之一` });
      }
      updateData.type = type;
    }

    if (priority !== undefined) {
      const validPriorities = ['low', 'normal', 'high', 'urgent'];
      if (!validPriorities.includes(priority)) {
        return error(ErrorCodes.VALIDATION_ERROR, { message: `priority 必须是 ${validPriorities.join('/')} 之一` });
      }
      updateData.priority = priority;
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    if (isPinned !== undefined) {
      updateData.isPinned = Boolean(isPinned);
    }

    if (publishedAt !== undefined) {
      updateData.publishedAt = publishedAt ? new Date(publishedAt) : null;
    }

    if (expiresAt !== undefined) {
      updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
    }

    const updated = await prisma.announcement.update({
      where: { id },
      data: updateData,
    });

    return success(updated, '公告更新成功');
  } catch (err) {
    return handlePrismaError(err, '更新公告失败');
  }
}

// DELETE /api/v1/announcements/[id] - 删除公告（仅管理员）
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

    if (!id) {
      return error(ErrorCodes.VALIDATION_ERROR, { message: '公告 ID 不能为空' });
    }

    // 检查公告是否存在
    const existing = await prisma.announcement.findUnique({
      where: { id },
    });

    if (!existing) {
      return error(ErrorCodes.NOT_FOUND, { message: '公告不存在' });
    }

    await prisma.announcement.delete({
      where: { id },
    });

    return success({ id }, '公告删除成功');
  } catch (err) {
    return handlePrismaError(err, '删除公告失败');
  }
}
