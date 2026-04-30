export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { success, handlePrismaError, errors } from '@/lib/api/v1';
import { requireAdmin, isAuthError, recordAuditLog } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/v1/admin/users/[id]/ban - 封禁用户
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const auth = await requireAdmin(req);
    if (isAuthError(auth)) {
      return auth.error;
    }

    // 仅超级管理员可封禁用户
    if (auth.role !== 'super_admin') {
      return errors.forbidden('仅超级管理员可执行封禁操作');
    }

    const { id } = await params;

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, isSystem: true, role: true, isBanned: true },
    });

    if (!targetUser) {
      return errors.notFound('用户');
    }

    if (targetUser.isSystem) {
      return errors.forbidden('无法封禁系统内置账号');
    }

    if (targetUser.id === auth.userId) {
      return errors.forbidden('无法封禁自己');
    }

    if (targetUser.role === 'super_admin') {
      return errors.forbidden('无法封禁超级管理员');
    }

    if (targetUser.isBanned) {
      return errors.conflict('该用户已被封禁');
    }

    // 创建封禁记录
    await prisma.userBan.create({
      data: {
        userId: id,
        bannerId: auth.userId,
        reason: '管理员直接封禁',
        banType: 'permanent',
        isActive: true,
      },
    });

    // 更新用户封禁状态
    await prisma.user.update({
      where: { id },
      data: { isBanned: true },
    });

    await recordAuditLog({
      adminId: auth.userId,
      actionType: 'ban',
      targetType: 'user',
      targetId: id,
      details: { username: targetUser.username },
    });

    return success({ userId: id }, '用户已被封禁');
  } catch (err) {
    return handlePrismaError(err, '封禁用户失败');
  }
}

// DELETE /api/v1/admin/users/[id]/ban - 解封用户
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

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, isBanned: true },
    });

    if (!targetUser) {
      return errors.notFound('用户');
    }

    if (!targetUser.isBanned) {
      return errors.badRequest('该用户未被封禁');
    }

    // 使用事务：停用封禁记录 + 解除用户封禁标记
    await prisma.$transaction(async (tx) => {
      await tx.userBan.updateMany({
        where: { userId: id, isActive: true },
        data: {
          isActive: false,
          unbanReason: '管理员解除封禁',
          unbannedAt: new Date(),
          unbannedBy: auth.userId,
        },
      });

      await tx.user.update({
        where: { id },
        data: { isBanned: false },
      });
    });

    await recordAuditLog({
      adminId: auth.userId,
      actionType: 'unban',
      targetType: 'user',
      targetId: id,
      details: { username: targetUser.username },
    });

    return success({ userId: id }, '用户已解封');
  } catch (err) {
    return handlePrismaError(err, '解封用户失败');
  }
}
