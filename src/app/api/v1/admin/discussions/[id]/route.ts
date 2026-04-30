export const dynamic = 'force-dynamic';
/**
 * v1 管理讨论详情 API
 * GET /api/v1/admin/discussions/[id] - 获取单个讨论
 * DELETE /api/v1/admin/discussions/[id] - 删除讨论
 */

import { NextRequest } from 'next/server';
import { success, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isAuthError, recordAuditLog } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';

// GET /api/v1/admin/discussions/[id] - 获取单个讨论
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await params;

    const discussion = await prisma.discussion.findUnique({
      where: { id, isDeleted: false },
      include: {
        author: { select: { id: true, username: true, avatarUrl: true, email: true } },
        _count: { select: { comments: { where: { isDeleted: false } } } },
      },
    });

    if (!discussion) {
      return error(ErrorCodes.NOT_FOUND, { message: '讨论不存在' });
    }

    return success({
      id: discussion.id,
      title: discussion.title,
      content: discussion.content,
      category: discussion.category,
      status: discussion.status,
      viewCount: discussion.viewCount,
      author: discussion.author,
      commentsCount: discussion._count.comments,
      createdAt: discussion.createdAt.toISOString(),
      updatedAt: discussion.updatedAt.toISOString(),
    });
  } catch (err) {
    return handlePrismaError(err, '获取讨论失败');
  }
}

// DELETE /api/v1/admin/discussions/[id] - 删除讨论
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

    const existing = await prisma.discussion.findUnique({
      where: { id, isDeleted: false },
    });

    if (!existing) {
      return error(ErrorCodes.NOT_FOUND, { message: '讨论不存在' });
    }

    await prisma.discussion.update({
      where: { id },
      data: { isDeleted: true },
    });

    await recordAuditLog({
      adminId: auth.userId,
      actionType: 'delete',
      targetType: 'discussion',
      targetId: id,
      details: { message: `删除讨论: ${existing.title}` },
    });

    return success({ id }, '讨论已删除');
  } catch (err) {
    return handlePrismaError(err, '删除讨论失败');
  }
}

// PATCH /api/v1/admin/discussions/[id] - 恢复讨论
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
    const { action } = body;

    if (action !== 'restore') {
      return errors.badRequest('无效的操作，仅支持 restore');
    }

    const existing = await prisma.discussion.findUnique({
      where: { id, isDeleted: true },
    });

    if (!existing) {
      return errors.notFound('讨论不存在或未被删除');
    }

    await prisma.discussion.update({
      where: { id },
      data: { isDeleted: false },
    });

    await recordAuditLog({
      adminId: auth.userId,
      actionType: 'restore',
      targetType: 'discussion',
      targetId: id,
      details: { message: `恢复讨论: ${existing.title}` },
    });

    return success({ id }, '讨论已恢复');
  } catch (err) {
    return handlePrismaError(err, '恢复讨论失败');
  }
}
