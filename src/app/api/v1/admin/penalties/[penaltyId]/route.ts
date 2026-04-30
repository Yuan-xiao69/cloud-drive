export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { success, handlePrismaError, errors } from '@/lib/api/v1';
import { requireAdmin, isAuthError, recordAuditLog } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE /api/v1/admin/penalties/[penaltyId] - 解除处罚
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ penaltyId: string }> }
): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    const { penaltyId } = await params;

    const penalty = await prisma.userPenalty.findUnique({
      where: { id: penaltyId },
      include: {
        user: { select: { id: true, username: true } },
      },
    });

    if (!penalty) {
      return errors.notFound('处罚记录');
    }

    if (!penalty.isActive) {
      return errors.badRequest('该处罚已被解除或已过期');
    }

    // 解析可选的解除原因（从 body 中）
    let removeReason = '';
    try {
      const body = await req.json();
      removeReason = body.reason || '';
    } catch {
      // body 为空时忽略
    }

    await prisma.userPenalty.update({
      where: { id: penaltyId },
      data: {
        isActive: false,
        removedAt: new Date(),
        removedBy: auth.userId,
        removeReason: removeReason || undefined,
      },
    });

    await recordAuditLog({
      adminId: auth.userId,
      userId: penalty.userId,
      actionType: 'remove_penalty',
      targetType: 'penalty',
      targetId: penaltyId,
      details: { penaltyType: penalty.penaltyType, username: penalty.user.username, removeReason },
    });

    return success({ id: penaltyId }, '处罚已解除');
  } catch (err) {
    return handlePrismaError(err, '解除处罚失败');
  }
}
