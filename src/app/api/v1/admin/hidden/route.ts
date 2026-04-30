export const dynamic = 'force-dynamic';
/**
 * v1 隐藏内容管理 API
 * GET /api/v1/admin/hidden - 获取隐藏内容列表
 * POST /api/v1/admin/hidden - 隐藏内容
 * PUT /api/v1/admin/hidden - 恢复内容
 * DELETE /api/v1/admin/hidden - 删除隐藏记录
 */

import { NextRequest } from 'next/server';
import { success, paginated, handlePrismaError, errors, parsePagination, buildPaginationMeta } from '@/lib/api/v1';
import { requireAdmin, isAuthError, recordAuditLog } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/v1/admin/hidden - 获取隐藏内容列表
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const sp = req.nextUrl.searchParams;
    const { page, size, skip } = parsePagination(sp);
    const keyword = sp.get('keyword')?.trim() || undefined;
    const status = sp.get('status');
    const targetType = sp.get('targetType');

    const where: Record<string, unknown> = {};

    if (keyword) {
      where.targetId = { contains: keyword, mode: 'insensitive' };
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'restored') {
      where.isActive = false;
    }

    if (targetType) {
      where.targetType = targetType;
    }

    const [items, total] = await Promise.all([
      prisma.hiddenContent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: size,
      }),
      prisma.hiddenContent.count({ where }),
    ]);

    const formattedItems = items.map((item) => ({
      id: item.id,
      targetType: item.targetType,
      targetId: item.targetId,
      reason: item.reason,
      hiddenBy: item.hiddenBy,
      isActive: item.isActive,
      restoredAt: item.restoredAt?.toISOString() ?? null,
      restoredBy: item.restoredBy,
      restoreReason: item.restoreReason,
      createdAt: item.createdAt.toISOString(),
    }));

    const pagination = buildPaginationMeta(total, page, size);
    return paginated(formattedItems, pagination);
  } catch (err) {
    return handlePrismaError(err);
  }
}

// POST /api/v1/admin/hidden - 隐藏内容
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const body = await req.json();
    const { targetType, targetId, reason } = body;

    if (!targetType || !targetId || !reason) {
      return errors.badRequest('缺少必填字段：targetType, targetId, reason');
    }

    const validTypes = ['repository', 'discussion', 'issue', 'pullrequest'];
    if (!validTypes.includes(targetType)) {
      return errors.badRequest(`无效的内容类型，可选值：${validTypes.join(', ')}`);
    }

    let targetExists = false;
    switch (targetType) {
      case 'repository': {
        const repo = await prisma.repository.findUnique({ where: { id: targetId } });
        targetExists = !!repo;
        break;
      }
      case 'discussion': {
        const discussion = await prisma.discussion.findUnique({ where: { id: targetId } });
        targetExists = !!discussion;
        break;
      }
      case 'issue': {
        const issue = await prisma.issue.findUnique({ where: { id: targetId } });
        targetExists = !!issue;
        break;
      }
      case 'pullrequest': {
        const pr = await prisma.pullRequest.findUnique({ where: { id: targetId } });
        targetExists = !!pr;
        break;
      }
    }

    if (!targetExists) {
      return errors.notFound('目标内容');
    }

    const existingHidden = await prisma.hiddenContent.findFirst({
      where: {
        targetType,
        targetId,
        isActive: true,
      },
    });

    if (existingHidden) {
      return errors.conflict('该内容已被隐藏');
    }

    const hidden = await prisma.hiddenContent.create({
      data: {
        targetType,
        targetId,
        reason,
        hiddenBy: auth.userId,
        isActive: true,
      },
    });

    switch (targetType) {
      case 'discussion':
        await prisma.discussion.update({ where: { id: targetId }, data: { isDeleted: true } });
        break;
      case 'issue':
        await prisma.issue.update({ where: { id: targetId }, data: { isDeleted: true } });
        break;
      case 'pullrequest':
        await prisma.pullRequest.update({ where: { id: targetId }, data: { isDeleted: true } });
        break;
    }

    await recordAuditLog({
      adminId: auth.userId,
      actionType: 'hide_content',
      targetType,
      targetId,
      details: { reason },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
    });

    return success({
      id: hidden.id,
      targetType: hidden.targetType,
      targetId: hidden.targetId,
      reason: hidden.reason,
      isActive: hidden.isActive,
      createdAt: hidden.createdAt.toISOString(),
    }, '内容已隐藏');
  } catch (err) {
    return handlePrismaError(err);
  }
}

// PUT /api/v1/admin/hidden - 恢复内容
export async function PUT(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const body = await req.json();
    const { id, restoreReason } = body;

    if (!id || !restoreReason) {
      return errors.badRequest('缺少必填字段：id, restoreReason');
    }

    const hidden = await prisma.hiddenContent.findUnique({
      where: { id },
    });

    if (!hidden) {
      return errors.notFound('隐藏记录');
    }

    if (!hidden.isActive) {
      return errors.conflict('该内容已被恢复');
    }

    await prisma.hiddenContent.update({
      where: { id },
      data: {
        isActive: false,
        restoredAt: new Date(),
        restoredBy: auth.userId,
        restoreReason,
      },
    });

    switch (hidden.targetType) {
      case 'discussion':
        await prisma.discussion.update({
          where: { id: hidden.targetId },
          data: { isDeleted: false },
        });
        break;
      case 'issue':
        await prisma.issue.update({
          where: { id: hidden.targetId },
          data: { isDeleted: false },
        });
        break;
      case 'pullrequest':
        await prisma.pullRequest.update({
          where: { id: hidden.targetId },
          data: { isDeleted: false },
        });
        break;
    }

    await recordAuditLog({
      adminId: auth.userId,
      actionType: 'restore_content',
      targetType: hidden.targetType,
      targetId: hidden.targetId,
      details: { restoreReason, hiddenRecordId: id },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
    });

    return success({ id }, '内容已恢复');
  } catch (err) {
    return handlePrismaError(err);
  }
}

// DELETE /api/v1/admin/hidden - 删除隐藏记录
export async function DELETE(req: NextRequest): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const sp = req.nextUrl.searchParams;
    const id = sp.get('id');

    if (!id) {
      return errors.badRequest('缺少隐藏记录ID');
    }

    const hidden = await prisma.hiddenContent.findUnique({
      where: { id },
    });

    if (!hidden) {
      return errors.notFound('隐藏记录');
    }

    if (hidden.isActive) {
      switch (hidden.targetType) {
        case 'discussion':
          await prisma.discussion.update({
            where: { id: hidden.targetId },
            data: { isDeleted: false },
          });
          break;
        case 'issue':
          await prisma.issue.update({
            where: { id: hidden.targetId },
            data: { isDeleted: false },
          });
          break;
        case 'pullrequest':
          await prisma.pullRequest.update({
            where: { id: hidden.targetId },
            data: { isDeleted: false },
          });
          break;
      }
    }

    await prisma.hiddenContent.delete({
      where: { id },
    });

    await recordAuditLog({
      adminId: auth.userId,
      actionType: 'delete_hidden_record',
      targetType: hidden.targetType,
      targetId: hidden.targetId,
      details: { hiddenRecordId: id },
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
    });

    return success({ id }, '隐藏记录已删除');
  } catch (err) {
    return handlePrismaError(err);
  }
}
