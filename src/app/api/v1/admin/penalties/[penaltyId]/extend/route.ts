export const dynamic = 'force-dynamic';

/**
 * v1 处罚延长 API
 * POST /api/v1/admin/penalties/[penaltyId]/extend - 延长处罚时间
 */

import { NextRequest } from 'next/server';
import { success, handlePrismaError, errors } from '@/lib/api/v1';
import { prisma } from '@/lib/prisma';
import { requireAdmin, isAuthError, recordAuditLog } from '@/lib/auth';

// POST /api/v1/admin/penalties/[penaltyId]/extend - 延长处罚
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ penaltyId: string }> }
): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    // 只有超级管理员可以延长处罚
    if (auth.role !== 'super_admin') {
      return errors.forbidden('只有超级管理员可以延长处罚');
    }

    const { penaltyId } = await params;
    const body = await req.json();
    const { days } = body;

    if (!days || days < 1) {
      return errors.badRequest('请输入有效的延长天数');
    }

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
      return errors.badRequest('该处罚已被解除或已过期，无法延长');
    }

    // 计算新的过期时间
    const currentExpiry = penalty.expiresAt || new Date();
    const newExpiresAt = new Date(currentExpiry.getTime() + days * 24 * 60 * 60 * 1000);

    await prisma.userPenalty.update({
      where: { id: penaltyId },
      data: {
        expiresAt: newExpiresAt,
      },
    });

    // 记录审计日志
    await recordAuditLog({
      adminId: auth.userId,
      actionType: 'extend_penalty',
      targetType: 'penalty',
      targetId: penaltyId,
      details: { message: `延长处罚 ${penalty.penaltyType} - ${penalty.user.username}：延长 ${days} 天，新过期时间：${newExpiresAt.toLocaleString()}` },
    });

    return success({
      id: penaltyId,
      expiresAt: newExpiresAt,
      remainingDays: Math.ceil((newExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    }, '处罚已延长');
  } catch (err) {
    return handlePrismaError(err, '延长处罚失败');
  }
}