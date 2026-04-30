export const dynamic = 'force-dynamic';
/**
 * v1 申诉详情 API
 * GET /api/v1/admin/appeals/[appealId] - 获取单个申诉
 * PATCH /api/v1/admin/appeals/[appealId] - 审批申诉（通过/拒绝）
 * DELETE /api/v1/admin/appeals/[appealId] - 删除申诉
 */

import { NextRequest } from 'next/server';
import { success, error, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isAuthError } from '@/lib/auth';
import { ErrorCodes } from '@/lib/api/v1';

// GET /api/v1/admin/appeals/[appealId] - 获取单个申诉
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ appealId: string }> }
): Promise<Response> {
  try {
    const { appealId } = await params;

    const appeal = await prisma.appeal.findUnique({
      where: { id: appealId },
      include: {
        user: {
          select: { id: true, username: true, email: true, avatarUrl: true, role: true },
        },
        reviewer: {
          select: { id: true, username: true },
        },
      },
    });

    if (!appeal) {
      return error(ErrorCodes.NOT_FOUND, { message: '申诉不存在' });
    }

    // 获取关联的处罚信息
    let targetInfo = null;
    try {
      switch (appeal.appealType) {
        case 'ban': {
          const ban = await prisma.userBan.findUnique({
            where: { id: appeal.targetId },
            include: { user: { select: { username: true } } },
          });
          if (ban) {
            targetInfo = { type: 'ban', user: ban.user?.username, reason: ban.reason, banType: ban.banType, expiresAt: ban.expiresAt };
          }
          break;
        }
        case 'hidden': {
          const hidden = await prisma.hiddenContent.findUnique({ where: { id: appeal.targetId } });
          if (hidden) {
            targetInfo = { type: 'hidden', targetType: hidden.targetType, targetId: hidden.targetId, reason: hidden.reason };
          }
          break;
        }
        case 'penalty': {
          const penalty = await prisma.userPenalty.findUnique({
            where: { id: appeal.targetId },
            include: { user: { select: { username: true } } },
          });
          if (penalty) {
            targetInfo = { type: 'penalty', user: penalty.user?.username, penaltyType: penalty.penaltyType, reason: penalty.reason, value: penalty.value };
          }
          break;
        }
      }
    } catch {
      // 忽略关联查询错误
    }

    return success({
      id: appeal.id,
      userId: appeal.userId,
      user: appeal.user,
      appealType: appeal.appealType,
      targetId: appeal.targetId,
      targetInfo,
      content: appeal.content,
      status: appeal.status,
      reviewerId: appeal.reviewerId,
      reviewer: appeal.reviewer,
      reviewNote: appeal.reviewNote,
      reviewedAt: appeal.reviewedAt?.toISOString() ?? null,
      createdAt: appeal.createdAt.toISOString(),
      updatedAt: appeal.updatedAt.toISOString(),
    });
  } catch (err) {
    return handlePrismaError(err, '获取申诉失败');
  }
}

// PATCH /api/v1/admin/appeals/[appealId] - 审批申诉
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ appealId: string }> }
): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const { appealId } = await params;
    const body = await req.json();
    const { action, reviewNote } = body;

    const appeal = await prisma.appeal.findUnique({ where: { id: appealId } });
    if (!appeal) {
      return error(ErrorCodes.NOT_FOUND, { message: '申诉不存在' });
    }

    if (appeal.status !== 'pending') {
      return errors.conflict('该申诉已被处理，无法重复操作');
    }

    if (!['approve', 'reject'].includes(action)) {
      return errors.badRequest('action 必须是 approve 或 reject');
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // 审批通过时，撤销相关处罚
    if (newStatus === 'approved') {
      try {
        switch (appeal.appealType) {
          case 'ban':
            await prisma.userBan.update({
              where: { id: appeal.targetId },
              data: { isActive: false },
            });
            break;
          case 'hidden':
            await prisma.hiddenContent.delete({ where: { id: appeal.targetId } });
            break;
          case 'penalty':
            await prisma.userPenalty.update({
              where: { id: appeal.targetId },
              data: { isActive: false },
            });
            break;
        }
      } catch {
        // 忽略撤销处罚的错误
      }
    }

    const updated = await prisma.appeal.update({
      where: { id: appealId },
      data: {
        status: newStatus,
        reviewerId: auth.userId,
        reviewNote: reviewNote || null,
        reviewedAt: new Date(),
      },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        reviewer: { select: { id: true, username: true } },
      },
    });

    return success({ appeal: updated }, action === 'approve' ? '申诉已通过' : '申诉已拒绝');
  } catch (err) {
    return handlePrismaError(err, '处理申诉失败');
  }
}

// DELETE /api/v1/admin/appeals/[appealId] - 删除申诉
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ appealId: string }> }
): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const { appealId } = await params;

    const appeal = await prisma.appeal.findUnique({ where: { id: appealId } });
    if (!appeal) {
      return error(ErrorCodes.NOT_FOUND, { message: '申诉不存在' });
    }

    await prisma.appeal.delete({ where: { id: appealId } });

    return success({ id: appealId }, '申诉已删除');
  } catch (err) {
    return handlePrismaError(err, '删除申诉失败');
  }
}
