export const dynamic = 'force-dynamic';

/**
 * v1 处罚备注 API
 * GET /api/v1/admin/penalties/[penaltyId]/notes - 获取备注列表
 * POST /api/v1/admin/penalties/[penaltyId]/notes - 添加备注
 */

import { NextRequest } from 'next/server';
import { success, created, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isAuthError, recordAuditLog } from '@/lib/auth';

// GET /api/v1/admin/penalties/[penaltyId]/notes - 获取备注列表
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ penaltyId: string }> }
): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const { penaltyId } = await params;

    // 检查处罚是否存在
    const penalty = await prisma.userPenalty.findUnique({
      where: { id: penaltyId },
    });

    if (!penalty) {
      return errors.notFound('处罚记录');
    }

    const notes = await prisma.penaltyNote.findMany({
      where: { penaltyId },
      orderBy: { createdAt: 'desc' },
    });

    return success({ notes });
  } catch (err) {
    return handlePrismaError(err);
  }
}

// POST /api/v1/admin/penalties/[penaltyId]/notes - 添加备注
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ penaltyId: string }> }
): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const { penaltyId } = await params;
    const body = await req.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return errors.badRequest('备注内容不能为空');
    }

    // 检查处罚是否存在
    const penalty = await prisma.userPenalty.findUnique({
      where: { id: penaltyId },
      include: {
        user: { select: { username: true } },
      },
    });

    if (!penalty) {
      return errors.notFound('处罚记录');
    }

    const note = await prisma.penaltyNote.create({
      data: {
        penaltyId,
        content: content.trim(),
        createdBy: auth.userId,
      },
    });

    // 记录审计日志
    await recordAuditLog({
      adminId: auth.userId,
      userId: penalty.userId,
      actionType: 'add_penalty_note',
      targetType: 'penalty',
      targetId: penaltyId,
      details: { note: content.trim().slice(0, 50) },
    });

    return created({ note }, '备注添加成功');
  } catch (err) {
    return handlePrismaError(err, '添加备注失败');
  }
}